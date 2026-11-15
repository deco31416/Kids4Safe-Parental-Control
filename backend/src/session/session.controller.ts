import { 
  Controller, 
  Get, 
  Post, 
  Param,
  Body,
  Ip,
  Query,
  Headers,
  HttpException, 
  HttpStatus,
  UseGuards,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { SessionCorrelationService } from './session-correlation.service';
import { QRService } from '../qr/qr.service';
import { AuditService } from '../audit/audit.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('🎯 Sesiones')
@Controller('session')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SessionController {
  private readonly logger = new Logger(SessionController.name);
  
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionCorrelationService: SessionCorrelationService,
    private readonly qrService: QRService,
    private readonly auditService: AuditService,
  ) {}

  private async assertPublisherSession(
    sessionId: string,
    publisherToken?: string,
    allowedStatuses?: Array<'active' | 'paused' | 'dropped'>,
  ) {
    const isValid = await this.sessionService.validatePublisherSessionToken(
      sessionId,
      publisherToken,
      allowedStatuses,
    );
    if (!isValid) {
      throw new HttpException('Publisher token inválido o ausente', HttpStatus.UNAUTHORIZED);
    }
  }

  // ========== RUTAS PÚBLICAS (sin autenticación) ==========
  
  /**
   * 🎯 JOIN: Usuario escanea QR y canjea por sessionId + config
   * 
   * Este endpoint es el "entry point" del flujo live:
   * 1. Valida QR (existe, activo, no expirado)
   * 2. Crea sessionId nuevo
   * 3. Retorna: sessionId, destinationUrl, policy
   */
  @Public()
  @Post('qr/:id/join')
  @ApiOperation({ summary: 'Canjear QR por sesión (público)' })
  @ApiResponse({ status: 200, description: 'Sesión creada' })
  @ApiResponse({ status: 404, description: 'QR no encontrado' })
  @ApiResponse({ status: 403, description: 'QR inactivo o expirado' })
  async joinByQR(
    @Param('id') qrId: string,
    @Ip() ip: string,
    @Body() body?: { browserDeviceId?: string },
  ) {
    try {
      const qr = await this.qrService.get(qrId);
      
      if (!qr) {
        throw new HttpException('QR no válido', HttpStatus.NOT_FOUND);
      }

      if (!qr.isActive) {
        throw new HttpException('QR desactivado', HttpStatus.FORBIDDEN);
      }

      // Validar expiración
      if (qr.expiresAt && qr.expiresAt < Date.now()) {
        throw new HttpException('QR expirado', HttpStatus.FORBIDDEN);
      }

      // Validar maxUses
      if (qr.policies?.maxUses && qr.policies.maxUses > 0) {
        if (qr.totalScans >= qr.policies.maxUses) {
          throw new HttpException('QR ya fue usado (one-time)', HttpStatus.FORBIDDEN);
        }
      }

      const finalDestinationUrl = qr.destinationUrl || qr.config?.redirect_url || null;
      if (!finalDestinationUrl) {
        this.logger.error(`❌ QR ${qr.id} sin destinationUrl - rechazando sesión`);
        throw new BadRequestException(
          'Este QR no está configurado correctamente. Por favor contacta al administrador.'
        );
      }

      const browserDeviceId = typeof body?.browserDeviceId === 'string' && body.browserDeviceId.length <= 128
        ? body.browserDeviceId
        : undefined;

      const reconnectableSession = await this.sessionService.findReconnectableQrSession(qr.id, browserDeviceId);
      const sessionId = reconnectableSession?.sessionId || this.sessionService.generateSessionId();
      await this.qrService.reserveScan(qr.id, !reconnectableSession);
      
      try {
        if (reconnectableSession) {
          await this.sessionService.reconnectQrSession(
            reconnectableSession,
            qr.name,
            ip,
            finalDestinationUrl,
          );
        } else {
          await this.sessionService.getOrCreate(
            sessionId,
            qr.id,
            qr.name,
            ip,
            finalDestinationUrl,
            browserDeviceId,
          );
        }
      } catch (error) {
        if (!reconnectableSession) await this.qrService.releaseScan(qr.id);
        throw error;
      }
      const publisherToken = await this.sessionService.issuePublisherSessionToken(sessionId);
      
      // Registrar sesión en el QR
      await this.qrService.addSession(qr.id, sessionId, false);

      // ✅ P0 FIX: Audit logging
      await this.auditService.log({
        eventType: reconnectableSession ? 'SESSION_RECONNECTED' : 'SESSION_JOINED',
        actorType: 'user',
        qrId: qr.id,
        sessionId,
        ip: ip,
        metadata: {
          qrName: qr.name,
          destinationUrl: qr.destinationUrl,
        },
        severity: 'info',
      });

      // Retornar config para el frontend
      return {
        success: true,
        sessionId,
        publisherToken,
        reconnected: !!reconnectableSession,
        browserDeviceId,
        destinationUrl: finalDestinationUrl,
        policy: {
          permissionsRequired: qr.policies?.permissionsRequired || [],
          permissionsOptional: qr.policies?.permissionsOptional || [],
          allowOpenDestination: qr.policies?.allowOpenDestination !== false,
          purposeText: qr.policies?.purposeText || 'Aceptar permisos para continuar',
          consentVersion: qr.policies?.consentVersion || '1.0',
          ttlSeconds: qr.policies?.ttlSeconds,
          maxSessionDuration: qr.policies?.max_session_duration,
        },
        qrName: qr.name,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al iniciar sesión',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ⚠️ IMPORTANTE: Rutas específicas ANTES de rutas dinámicas (:id)
  @Get('active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar sesiones activas (requiere view_sessions)' })
  async getActiveSessions(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('source') source?: string,
    @Query('qrId') qrId?: string,
  ) {
    try {
      const page = await this.sessionService.getActivePage({
        limit,
        cursor,
        source,
        qrId,
      });
      return { success: true, ...page };
    } catch (error) {
      console.error('❌ [GET /session/active] Error:', error);
      throw new HttpException(
        'Error al obtener sesiones activas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  @Get(':id/public')
  @Public()
  @ApiOperation({ summary: 'Obtener estado público mínimo de sesión' })
  @ApiResponse({ status: 200, description: 'Sesión encontrada' })
  async getPublicSession(@Param('id') id: string) {
    try {
      const session = await this.sessionService.get(id);

      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      const qr = await this.qrService.get(session.qrId);

      if (!qr) {
        throw new HttpException('QR no válido', HttpStatus.NOT_FOUND);
      }

      if (!qr.isActive) {
        throw new HttpException('QR desactivado', HttpStatus.FORBIDDEN);
      }

      return {
        success: true,
        sessionId: session.sessionId,
        qrId: session.qrId,
        qrName: session.qrName,
        source: session.qrId?.startsWith('mobile-direct:') ? 'mobile-app' : 'qr',
        status: session.status,
        createdAt: session.createdAt,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener la sesión',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Permissions('view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información de sesión (admin)' })
  @ApiResponse({ status: 200, description: 'Sesión encontrada' })
  async getSession(@Param('id') id: string) {
    try {
      const session = await this.sessionService.getAdminSession(id);

      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      return session;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener la sesión',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/device-info')
  async updateDeviceInfo(
    @Param('id') id: string,
    @Body() deviceInfo: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(id, publisherToken);
    await this.sessionService.updateDeviceInfo(id, deviceInfo);
    
    // 🆕 Procesar correlación multi-session (fraud detection)
    try {
      const correlation = await this.sessionCorrelationService.processSessionCorrelation(
        id,
        deviceInfo
      );
      
      // Si hay correlación crítica, registrar evento
      if (correlation.correlationRisk === 'critical' || correlation.correlationRisk === 'high') {
        await this.auditService.log({
          eventType: 'CORRELATION_DETECTED',
          actorType: 'system',
          sessionId: id,
          metadata: {
            correlationCount: correlation.correlationCount,
            correlationRisk: correlation.correlationRisk,
            correlationScore: correlation.correlationScore,
            deviceFingerprint: correlation.deviceFingerprint.substring(0, 16),
          },
          severity: correlation.correlationRisk === 'critical' ? 'critical' : 'warning',
        });
      }
      
      return { 
        ok: true,
        correlation: {
          detected: correlation.correlationCount > 0,
          count: correlation.correlationCount,
          risk: correlation.correlationRisk,
        }
      };
    } catch (error) {
      // Si falla la correlación, no bloquear el flujo
      console.error('Error procesando correlación:', error);
      return { ok: true };
    }
  }

  @Public()
  @Post(':id/capabilities')
  async updateCapabilities(
    @Param('id') id: string,
    @Body() capabilities: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(id, publisherToken);
    await this.sessionService.updateCapabilities(id, capabilities);
    return { ok: true };
  }

  /**
   * 🔐 Evalúa policy para sesión
   * 
   * Frontend llama ANTES de pedir permisos
   * Si allow_continue=false → muestra error y bloquea
   */
  @Public()
  @Post(':id/evaluate-policy')
  async evaluatePolicy(
    @Param('id') sessionId: string,
    @Body() payload: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(sessionId, publisherToken);
    const decision = await this.sessionService.evaluatePolicy({
      ...payload,
      session_state: { sessionId, ...payload.session_state },
    });

    if (!decision.allow_continue) {
      throw new HttpException(
        {
          message: 'Acceso denegado por policy',
          reason: decision.reason,
          required_permissions: decision.required_permissions,
        },
        HttpStatus.FORBIDDEN
      );
    }

    return {
      ok: true,
      decision,
    };
  }

  @Public()
  @Post(':id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() location: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(id, publisherToken);
    await this.sessionService.updateLocation(id, location);
    return { ok: true };
  }

  @Public()
  @Post(':id/permissions')
  async updatePermissions(
    @Param('id') id: string,
    @Body() permissions: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(id, publisherToken);
    await this.sessionService.updatePermissions(id, permissions);
    return { ok: true };
  }

  @Public()
  @Post(':id/streams')
  async updateStreams(
    @Param('id') id: string,
    @Body() streams: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    await this.assertPublisherSession(id, publisherToken);
    await this.sessionService.updateStreams(id, streams);
    return { ok: true };
  }

  @Public()
  @Post(':id/heartbeat')
  @ApiOperation({ summary: 'Heartbeat con compliance monitoring (P0 #2)' })
  async heartbeat(
    @Param('id') id: string,
    @Body() body: {
      clientTimestamp?: number;
      expectedInterval?: number;
      timeSinceLast?: number;
      missedCount?: number;
    },
    @Ip() ip: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken, ['active', 'dropped']);
      console.log('💓 [Heartbeat] Recibido para sessionId:', id);
      await this.sessionService.heartbeat(id);
      console.log('✅ [Heartbeat] Actualizado en base de datos');

      // 🔍 P0 #2: Heartbeat Compliance Monitoring
      const session = await this.sessionService.get(id);
      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      // Detectar HEARTBEAT_DELAYED (llegó >2s tarde)
      if (body.timeSinceLast && body.expectedInterval) {
        const delayMs = body.timeSinceLast - body.expectedInterval;
        if (delayMs > 2000) {
          // Confidence basada en magnitud del delay
          const sourceConfidence: 'high' | 'medium' | 'low' = 
            delayMs > 10000 ? 'high' : delayMs > 5000 ? 'medium' : 'low';
          
          await this.auditService.log({
            eventType: 'HEARTBEAT_DELAYED',
            actorType: 'user',
            actorId: id,
            sessionId: id,
            qrId: session.qrId,
            metadata: {
              delayMs,
              expectedInterval: body.expectedInterval,
              actualInterval: body.timeSinceLast,
              clientTimestamp: body.clientTimestamp,
              sourceConfidence,
            },
            severity: 'warning', // Puede ser red lenta o tab hidden
            ip,
          });
        }
      }

      // Detectar HEARTBEAT_MISSED (múltiples beats perdidos)
      if (body.missedCount && body.missedCount >= 2) {
        // Confidence basada en cantidad de beats perdidos
        const sourceConfidence: 'high' | 'medium' | 'low' = 
          body.missedCount >= 5 ? 'high' : body.missedCount >= 3 ? 'medium' : 'low';
        
        await this.auditService.log({
          eventType: 'HEARTBEAT_MISSED',
          actorType: 'user',
          actorId: id,
          sessionId: id,
          qrId: session.qrId,
          metadata: {
            missedCount: body.missedCount,
            clientTimestamp: body.clientTimestamp,
            sourceConfidence,
          },
          severity: 'critical', // Posible evasión o pérdida de conectividad
          ip,
        });
      }

      return { ok: true, message: 'Heartbeat registrado' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error en heartbeat',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/pause')
  async pause(
    @Param('id') id: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken);
      await this.sessionService.pause(id);
      
      // ✅ P0 FIX: Audit logging
      await this.auditService.log({
        eventType: 'SESSION_PAUSED',
        actorType: 'user',
        sessionId: id,
        severity: 'info',
      });
      
      return { ok: true, message: 'Sesión pausada' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al pausar la sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/resume')
  async resume(
    @Param('id') id: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken, ['paused']);
      await this.sessionService.resume(id);
      
      // ✅ P0 FIX: Audit logging
      await this.auditService.log({
        eventType: 'SESSION_RESUMED',
        actorType: 'user',
        sessionId: id,
        severity: 'info',
      });
      
      return { ok: true, message: 'Sesión reanudada' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al reanudar la sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/end')
  async end(
    @Param('id') id: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken, ['active', 'paused']);
      await this.sessionService.complete(id);
      
      // ✅ P0 FIX: Audit logging
      await this.auditService.log({
        eventType: 'SESSION_ENDED',
        actorType: 'user',
        sessionId: id,
        severity: 'info',
      });
      
      return { ok: true, message: 'Sesión terminada' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al terminar la sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🕵️ Obtener sesiones correlacionadas (mismo device fingerprint en 24h)
   * Para Admin Panel - Fraud detection
   */
  @Get(':id/correlation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener sesiones correlacionadas (requiere view_sessions)' })
  async getCorrelation(@Param('id') sessionId: string) {
    try {
      const correlation = await this.sessionCorrelationService.getSessionCorrelation(sessionId);
      return {
        success: true,
        ...correlation,
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener correlación',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/content-redirect')
  async contentRedirect(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken);
      await this.sessionService.updateContentRedirect(id, {
        redirected: true,
        redirectedAt: body.redirectedAt || Date.now(),
        contentUrl: body.contentUrl,
      });
      return { ok: true, message: 'Redirect registrado' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al registrar redirect',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(id, publisherToken, ['active', 'paused']);
      const session = await this.sessionService.complete(id);
      return { ok: true, session };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al completar la sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔍 P0 #5: Clipboard & Screenshot Attempt Detection
   * Endpoint público para registrar actividad de clipboard
   */
  @Public()
  @Post(':id/clipboard-event')
  @ApiOperation({ summary: 'Registrar actividad de clipboard (forense)' })
  async logClipboardEvent(
    @Param('id') sessionId: string,
    @Body() event: {
      type: 'CLIPBOARD_COPY' | 'CLIPBOARD_PASTE' | 'CLIPBOARD_CUT' | 'SCREENSHOT_ATTEMPT';
      timestamp: number;
      target?: string;
    },
    @Ip() ip: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(sessionId, publisherToken);
      const session = await this.sessionService.get(sessionId);
      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      // Severidad: clipboard activity es sospechosa si es frecuente
      const severity: 'info' | 'warning' | 'critical' = 
        event.type === 'SCREENSHOT_ATTEMPT' ? 'warning' : 'info';
      
      // Confidence: screenshot detection es limitado (solo ciertas teclas)
      const sourceConfidence: 'high' | 'medium' | 'low' = 
        event.type === 'SCREENSHOT_ATTEMPT' ? 'medium' : 'high';

      await this.auditService.log({
        eventType: event.type,
        actorType: 'user',
        actorId: sessionId,
        sessionId,
        qrId: session.qrId,
        metadata: {
          target: event.target,
          clientTimestamp: event.timestamp,
          sourceConfidence,
        },
        severity,
        ip,
      });

      return { success: true, logged: event.type };
    } catch (error) {
      console.error('Error logging clipboard event:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al registrar evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔍 P0 #4: Media Track Interruption Detection
   * Endpoint público para registrar eventos de media tracks
   */
  @Public()
  @Post(':id/media-track-event')
  @ApiOperation({ summary: 'Registrar evento de media track (forense)' })
  async logMediaTrackEvent(
    @Param('id') sessionId: string,
    @Body() event: {
      type: 'TRACK_ENDED' | 'TRACK_MUTED' | 'TRACK_UNMUTED';
      timestamp: number;
      trackKind: 'audio' | 'video';
      trackLabel: string;
      trackId: string;
      enabled: boolean;
      muted: boolean;
      readyState: 'live' | 'ended';
      unmuteDuration?: number; // Para TRACK_MUTED: duración hasta unmute (si aplica)
    },
    @Ip() ip: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(sessionId, publisherToken, ['active', 'dropped']);
      const session = await this.sessionService.get(sessionId);
      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      // Severidad según tipo de evento y duración
      let severity: 'info' | 'warning' | 'critical' = 'info';
      let sourceConfidence: 'high' | 'medium' | 'low' = 'high';
      
      if (event.type === 'TRACK_ENDED') {
        severity = 'critical'; // Dispositivo desconectado o permiso revocado
        sourceConfidence = 'high'; // MediaStreamTrack API confiable
      } else if (event.type === 'TRACK_MUTED') {
        // Si hay unmuteDuration y es <10s, es info (mute temporal)
        const unmuteDuration = event.unmuteDuration || 0;
        severity = unmuteDuration > 0 && unmuteDuration < 10000 ? 'info' : 'warning';
        sourceConfidence = 'high'; // MediaStreamTrack API confiable
      } else if (event.type === 'TRACK_UNMUTED') {
        severity = 'info';
        sourceConfidence = 'high';
      }

      await this.auditService.log({
        eventType: event.type,
        actorType: 'user',
        actorId: sessionId,
        sessionId,
        qrId: session.qrId,
        metadata: {
          trackKind: event.trackKind,
          trackLabel: event.trackLabel,
          trackId: event.trackId,
          enabled: event.enabled,
          muted: event.muted,
          readyState: event.readyState,
          clientTimestamp: event.timestamp,
          unmuteDuration: event.unmuteDuration,
          sourceConfidence,
        },
        severity,
        ip,
      });

      return { success: true, logged: event.type };
    } catch (error) {
      console.error('Error logging media track event:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al registrar evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔍 P0 #3: WebRTC Connection State Timeline
   * Endpoint público para registrar cambios de estado WebRTC
   */
  @Public()
  @Post(':id/webrtc-state')
  @ApiOperation({ summary: 'Registrar estado WebRTC (forense)' })
  async logWebRTCState(
    @Param('id') sessionId: string,
    @Body() event: {
      timestamp: number;
      connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
      iceConnectionState: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';
      iceGatheringState: 'new' | 'gathering' | 'complete';
      signalingState: 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed';
    },
    @Ip() ip: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(sessionId, publisherToken);
      const session = await this.sessionService.get(sessionId);
      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      // Severidad según estado
      let severity: 'info' | 'warning' | 'critical' = 'info';
      const sourceConfidence: 'high' | 'medium' | 'low' = 'high'; // RTCPeerConnection API confiable
      let eventType = 'WEBRTC_STATE_CHANGE';

      if (event.connectionState === 'failed' || event.iceConnectionState === 'failed') {
        severity = 'critical';
        eventType = 'WEBRTC_CONNECTION_FAILED';
      } else if (event.connectionState === 'disconnected') {
        severity = 'warning';
        eventType = 'WEBRTC_DISCONNECTED';
      } else if (event.connectionState === 'connected') {
        eventType = 'WEBRTC_CONNECTED';
      }

      await this.auditService.log({
        eventType,
        actorType: 'system',
        actorId: sessionId,
        sessionId,
        qrId: session.qrId,
        metadata: {
          connectionState: event.connectionState,
          iceConnectionState: event.iceConnectionState,
          iceGatheringState: event.iceGatheringState,
          signalingState: event.signalingState,
          clientTimestamp: event.timestamp,
          sourceConfidence,
        },
        severity,
        ip,
      });

      return { success: true, logged: eventType };
    } catch (error) {
      console.error('Error logging WebRTC state:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al registrar estado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 🔍 P0 #1: Tab Visibility & Focus Tracking
   * Endpoint público para recibir eventos de visibilidad de tab
   */
  @Public()
  @Post(':id/tab-event')
  @ApiOperation({ summary: 'Registrar evento de visibilidad de tab (forense)' })
  async logTabEvent(
    @Param('id') sessionId: string,
    @Body() event: {
      type: 'TAB_HIDDEN' | 'TAB_VISIBLE' | 'WINDOW_BLUR' | 'WINDOW_FOCUS' | 'PAGE_HIDE' | 'BEFORE_UNLOAD';
      timestamp: number;
      visibilityState: 'visible' | 'hidden' | 'prerender';
      focused: boolean;
      persisted?: boolean;
    },
    @Ip() ip: string,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    try {
      await this.assertPublisherSession(sessionId, publisherToken, ['active', 'dropped']);
      const session = await this.sessionService.get(sessionId);
      if (!session) {
        throw new HttpException('Sesión no encontrada', HttpStatus.NOT_FOUND);
      }

      // Registrar en audit log con severidad según criticidad forense
      let severity: 'info' | 'warning' | 'critical' = 'info';
      let sourceConfidence: 'high' | 'medium' | 'low' = 'high';
      
      if (event.type === 'TAB_HIDDEN' || event.type === 'WINDOW_BLUR') {
        severity = 'warning'; // Usuario perdió foco - posible evasión
        sourceConfidence = 'high'; // Browser API confiable
      }
      if (event.type === 'BEFORE_UNLOAD') {
        severity = 'warning'; // Usuario está cerrando (ajustado de critical)
        sourceConfidence = 'high'; // Browser API confiable
      }

      await this.auditService.log({
        eventType: event.type,
        actorType: 'user',
        actorId: sessionId,
        sessionId,
        qrId: session.qrId,
        metadata: {
          visibilityState: event.visibilityState,
          focused: event.focused,
          persisted: event.persisted,
          clientTimestamp: event.timestamp,
          sourceConfidence,
        },
        severity,
        ip,
      });

      return { success: true, logged: event.type };
    } catch (error) {
      console.error('Error logging tab event:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al registrar evento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nueva sesión (requiere manage_sessions)' })
  async createSession(@Body() body: { qrId: string; name?: string; ip?: string }) {
    const sessionId = this.sessionService.generateSessionId();
    const session = await this.sessionService.getOrCreate(
      sessionId,
      body.qrId,
      body.name || 'Session',
      body.ip || 'unknown'
    );
    return { sessionId, session };
  }
}

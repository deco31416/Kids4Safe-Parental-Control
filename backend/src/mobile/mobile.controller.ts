import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  NotFoundException,
  Param,
  Post,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { AudioClipsService } from '../audio-clips/audio-clips.service';
import { LiveService } from '../live/live.service';
import { LocationHistoryService } from '../location/location-history.service';
import { NotificationService } from '../notification/notification.service';
import { AdminNotificationType } from '../notification/notification.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ScreenshotsService } from '../screenshots/screenshots.service';
import { SessionService } from '../session/session.service';
import { MobileProfileService } from '../mobile-profile/mobile-profile.service';
import { MobileUnitService } from './mobile-unit.service';

@ApiTags('📱 Mobile App')
@Controller('mobile')
export class MobileController {
  private readonly audioCaptureLastSeen = new Map<string, number>();
  private readonly sensorLastSeen = new Map<string, number>();

  constructor(
    private readonly auditService: AuditService,
    private readonly audioClipsService: AudioClipsService,
    private readonly liveService: LiveService,
    private readonly locationHistoryService: LocationHistoryService,
    private readonly mobileProfileService: MobileProfileService,
    private readonly mobileUnitService: MobileUnitService,
    private readonly notificationService: NotificationService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly screenshotsService: ScreenshotsService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('units/register')
  @ApiOperation({ summary: 'Registrar instalación móvil y token PUSH persistente' })
  async registerUnit(
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Body() body: {
      mobileUnitId?: string;
      deviceLabel?: string;
      appVersion?: string;
      platform?: string;
      notificationToken?: string;
      notificationProvider?: string;
    },
  ) {
    if (!body.mobileUnitId) throw new BadRequestException('mobileUnitId es requerido');
    const mobileUnitId = this.normalizeMobileUnitId(body.mobileUnitId);
    return this.mobileUnitService.register(mobileUnitId, body, mobileUnitToken);
  }

  @Delete('units/:mobileUnitId/notifications/token')
  @ApiOperation({ summary: 'Eliminar el token PUSH persistente de una unidad móvil' })
  async clearUnitNotificationToken(
    @Param('mobileUnitId') mobileUnitId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
  ) {
    const unitId = this.normalizeMobileUnitId(mobileUnitId);
    const result = await this.mobileUnitService.clearNotificationToken(unitId, mobileUnitToken);
    await this.auditService.log({
      actorId: unitId,
      actorType: 'user',
      eventType: 'MOBILE_PUSH_TOKEN_REMOVED',
      metadata: { source: 'app-movil' },
      severity: 'info',
    });
    return result;
  }

  @Patch('units/:mobileUnitId/notifications/:notificationId/seen')
  @ApiOperation({ summary: 'Marcar PUSH visto usando identidad de unidad móvil' })
  async markUnitPushSeen(
    @Param('mobileUnitId') mobileUnitId: string,
    @Param('notificationId') notificationId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
  ) {
    const unitId = this.normalizeMobileUnitId(mobileUnitId);
    const unit = await this.mobileUnitService.assertUnitToken(unitId, mobileUnitToken);
    if (!unit.lastSessionId) throw new NotFoundException('Unidad sin sesión asociada');
    const notification = await this.notificationService.markPushAsSeen(
      notificationId,
      unit.lastSessionId,
    );
    if (!notification) throw new NotFoundException('Notificación no encontrada para la unidad');
    return { ok: true };
  }

  @Post('units/:mobileUnitId/notifications/:notificationId/respond')
  @ApiOperation({ summary: 'Aceptar o rechazar una solicitud PUSH de servicios' })
  async respondToUnitPush(
    @Param('mobileUnitId') mobileUnitId: string,
    @Param('notificationId') notificationId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Body() body: { decision?: 'accepted' | 'rejected'; targets?: string[] },
  ) {
    const unitId = this.normalizeMobileUnitId(mobileUnitId);
    const unit = await this.mobileUnitService.assertUnitToken(unitId, mobileUnitToken);
    if (!unit.lastSessionId) throw new NotFoundException('Unidad sin sesión asociada');
    const decision = body.decision === 'accepted' ? 'accepted' : 'rejected';
    const allowed = new Set(['camera', 'microphone', 'screen', 'location']);
    const targets = (body.targets || []).filter((target) => allowed.has(target)) as Array<
      'camera' | 'microphone' | 'screen' | 'location'
    >;
    const result = await this.notificationService.respondToPush(
      notificationId,
      unit.lastSessionId,
      decision,
      targets,
    );
    if (!result) throw new NotFoundException('Solicitud no encontrada para la unidad');
    if (result.expired) throw new BadRequestException('La solicitud PUSH expiró');
    await this.auditService.log({
      actorId: unitId,
      actorType: 'user',
      eventType: decision === 'accepted' ? 'MOBILE_PUSH_REQUEST_ACCEPTED' : 'MOBILE_PUSH_REQUEST_REJECTED',
      metadata: { notificationId, targets },
      sessionId: unit.lastSessionId,
      severity: decision === 'accepted' ? 'warning' : 'info',
    });
    return { decision, ok: true, targets };
  }

  @Post('units/:mobileUnitId/location')
  @ApiOperation({ summary: 'Guardar ubicación pasiva de unidad móvil sin iniciar Auxilio' })
  async unitLocation(
    @Param('mobileUnitId') mobileUnitId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Body() body: any,
  ) {
    const unitId = this.normalizeMobileUnitId(mobileUnitId);
    const latitude = Number(body.latitude ?? body.lat);
    const longitude = Number(body.longitude ?? body.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('latitude y longitude son requeridos');
    }

    return this.mobileUnitService.updateLocation(unitId, mobileUnitToken, {
      latitude,
      longitude,
      accuracy: body.accuracy != null ? Number(body.accuracy) : undefined,
      source: body.source || 'gps-always',
      timestampMs: body.timestampMs || Date.now(),
    });
  }

  @Post('units/:mobileUnitId/gps-always/status')
  @ApiOperation({ summary: 'Guardar estado ON/OFF del GPS always-on de una unidad móvil' })
  async unitGpsAlwaysStatus(
    @Param('mobileUnitId') mobileUnitId: string,
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Body() body: { enabled?: boolean },
  ) {
    const unitId = this.normalizeMobileUnitId(mobileUnitId);
    return this.mobileUnitService.updateGpsAlwaysStatus(unitId, mobileUnitToken, Boolean(body.enabled));
  }

  private normalizeMobileUnitId(unitId: string) {
    const normalized = unitId.trim();
    if (!/^mobile-[a-zA-Z0-9-]{8,80}$/.test(normalized)) {
      throw new BadRequestException('mobileUnitId no tiene un formato permitido');
    }

    return normalized;
  }

  private assertThrottle(
    bucket: Map<string, number>,
    key: string,
    windowMs: number,
    message: string,
  ) {
    const now = Date.now();
    const lastSeen = bucket.get(key) || 0;

    if (now - lastSeen < windowMs) {
      throw new BadRequestException(message);
    }

    bucket.set(key, now);
  }

  private parseFiniteNumber(value: unknown, fieldName: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${fieldName} debe ser un número válido`);
    }

    return parsed;
  }

  private normalizeVector3(
    vector: { x?: unknown; y?: unknown; z?: unknown } | undefined,
    fieldName: string,
  ) {
    if (!vector) return undefined;

    return {
      x: this.parseFiniteNumber(vector.x, `${fieldName}.x`),
      y: this.parseFiniteNumber(vector.y, `${fieldName}.y`),
      z: this.parseFiniteNumber(vector.z, `${fieldName}.z`),
    };
  }

  private normalizeAppState(value: unknown): 'active' | 'background' | 'inactive' | undefined {
    return value === 'active' || value === 'background' || value === 'inactive' ? value : undefined;
  }

  private normalizeLifecycleSource(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(normalized)) return undefined;
    return normalized;
  }

  @Post('emergency/start')
  @ApiOperation({ summary: 'Iniciar sesión de emergencia desde app móvil' })
  async startEmergency(
    @Body() body: {
      mobileUnitId?: string;
      deviceLabel?: string;
      destinationUrl?: string;
      appVersion?: string;
      platform?: string;
    },
    @Headers('x-mobile-unit-token') mobileUnitToken: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    if (!body.mobileUnitId) {
      throw new BadRequestException('mobileUnitId es requerido para transmisiones directas');
    }

    const mobileUnitId = this.normalizeMobileUnitId(body.mobileUnitId);
    await this.mobileUnitService.assertUnitToken(mobileUnitId, mobileUnitToken);
    const sessionId = this.sessionService.generateSessionId();
    const qrId = `mobile-direct:${mobileUnitId}`;
    const qrName = body.deviceLabel || 'Kids4Safe Mobile';

    const session = await this.sessionService.getOrCreate(
      sessionId,
      qrId,
      qrName,
      ip,
      body.destinationUrl || 'mobile-emergency',
    );
    await this.sessionService.markMobileSession(sessionId, {
      unitId: mobileUnitId,
      deviceLabel: qrName,
      appVersion: body.appVersion,
      platform: body.platform || 'react-native',
      activationMode: 'direct',
    });
    const mobileProfile = await this.mobileProfileService.getOrCreate(mobileUnitId).catch(() => null);
    if (mobileProfile) {
      await this.sessionService.updateMobileProfileSnapshot(sessionId, {
        avatarThumbnailUrl: mobileProfile.avatarThumbnailUrl,
        avatarUri: mobileProfile.avatarUri,
        bloodType: mobileProfile.bloodType,
        emergencyContact: mobileProfile.emergencyContact,
        fullName: mobileProfile.fullName,
        phone: mobileProfile.phone,
        securityId: mobileProfile.securityId,
      });
    }
    await this.mobileUnitService.linkSession(mobileUnitId, sessionId);
    const mobileSessionToken = await this.sessionService.issueMobileSessionToken(sessionId);
    const closedPreviousSessions = await this.sessionService.closeOtherActiveMobileSessions(mobileUnitId, sessionId);
    await this.realtimeGateway.closeSessionRooms(closedPreviousSessions, 'mobile_session_replaced');
    await this.sessionService.updateDeviceInfo(sessionId, {
      userAgent: userAgent || 'Kids4Safe Mobile App',
      platform: body.platform || 'react-native',
      type: 'mobile',
      mobileUnitId,
      appVersion: body.appVersion,
    });

    await this.auditService.log({
      eventType: 'MOBILE_EMERGENCY_STARTED',
      actorType: 'user',
      qrId,
      sessionId,
      ip,
      metadata: {
        source: 'app-movil',
        activationMode: 'direct',
        mobileUnitId,
        deviceLabel: qrName,
        destinationUrl: body.destinationUrl,
        closedPreviousSessionIds: closedPreviousSessions,
        closedPreviousSessions: closedPreviousSessions.length,
      },
      severity: 'critical',
    });

    await this.notificationService.createAdminNotification(
      AdminNotificationType.MOBILE_EMERGENCY_STARTED,
      `Auxilio activo desde ${qrName} (${mobileUnitId})`,
      sessionId,
      qrId,
    );

    return {
      success: true,
      sessionId,
      mobileUnitId,
      mobileSessionToken,
      qrId,
      destinationUrl: body.destinationUrl || 'mobile-emergency',
      qrName,
      policy: {
        permissionsRequired: ['location'],
        permissionsOptional: ['camera', 'mic', 'orientation'],
        allowOpenDestination: false,
        purposeText: 'Activación de emergencia desde app móvil',
        consentVersion: '1.0',
      },
      session,
    };
  }

  @Post(':sessionId/consent')
  @ApiOperation({ summary: 'Registrar consentimiento/activación móvil' })
  async consent(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { qrId?: string; consentVersion?: string; permissions?: string[]; purpose?: string },
  ) {
    const session = await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.addConsent(sessionId, {
      accepted: true,
      consentVersion: body.consentVersion || '1.0',
      permissions: body.permissions || [],
      purpose: body.purpose,
    });
    await this.auditService.log({
      eventType: 'MOBILE_CONSENT_ACCEPTED',
      actorType: 'user',
      qrId: body.qrId || session.qrId,
      sessionId,
      metadata: {
        consentVersion: body.consentVersion || '1.0',
        permissions: body.permissions || [],
        purpose: body.purpose,
      },
      severity: 'info',
    });
    return { ok: true };
  }

  @Post(':sessionId/device-info')
  @ApiOperation({ summary: 'Guardar información del dispositivo móvil' })
  async deviceInfo(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updateDeviceInfo(sessionId, {
      ...body,
      type: 'mobile',
      source: 'app-movil',
    });
    await this.auditService.log({
      eventType: 'MOBILE_DEVICE_INFO_COLLECTED',
      actorType: 'user',
      sessionId,
      metadata: body,
      severity: 'info',
    });
    return { ok: true };
  }

  @Post(':sessionId/capabilities')
  @ApiOperation({ summary: 'Guardar capacidades nativas del móvil' })
  async capabilities(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updateCapabilities(sessionId, {
      ...body,
      deviceType: 'mobile',
      source: 'app-movil',
    });
    return { ok: true };
  }

  @Post(':sessionId/permissions')
  @ApiOperation({ summary: 'Guardar permisos nativos concedidos en móvil' })
  async permissions(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updatePermissions(sessionId, body);
    await this.auditService.log({
      eventType: 'MOBILE_PERMISSIONS_UPDATED',
      actorType: 'user',
      sessionId,
      metadata: body,
      severity: 'info',
    });
    return { ok: true };
  }

  @Post(':sessionId/streams')
  @ApiOperation({ summary: 'Guardar estado de transmisiones móviles' })
  async streams(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updateStreams(sessionId, body);
    return { ok: true };
  }

  @Post(':sessionId/location')
  @ApiOperation({ summary: 'Recibir ubicación GPS desde app móvil' })
  async location(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    const session = await this.assertActiveSession(sessionId, mobileSessionToken);
    const latitude = body.latitude ?? body.lat;
    const longitude = body.longitude ?? body.lng;
    await this.sessionService.updateLocation(sessionId, {
      ...body,
      source: body.source || 'gps',
    });
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      await this.locationHistoryService.addLocation({
        sessionId,
        qrId: session.qrId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: body.accuracy != null ? Number(body.accuracy) : undefined,
        altitude: body.altitude != null ? Number(body.altitude) : undefined,
        heading: body.heading != null ? Number(body.heading) : undefined,
        speed: body.speed != null ? Number(body.speed) : undefined,
        timestamp: body.timestampMs ? new Date(Number(body.timestampMs)) : new Date(),
        source: 'gps',
        metadata: {
          confidence: body.accuracy != null && Number(body.accuracy) <= 50 ? 0.95 : 0.75,
        },
      }).catch((error) =>
        this.auditService.log({
          eventType: 'MOBILE_LOCATION_HISTORY_SAVE_FAILED',
          actorType: 'system',
          sessionId,
          metadata: {
            message: error?.message,
            source: 'app-movil',
          },
          severity: 'warning',
        }),
      );
    }
    await this.liveService.handleLocationRealtime({
      sessionId,
      lat: latitude,
      lng: longitude,
      accuracy: body.accuracy,
      timestampMs: body.timestampMs || Date.now(),
      source: body.source || 'gps',
    }).catch((error) =>
      this.auditService.log({
        eventType: 'MOBILE_LOCATION_REALTIME_FORWARD_FAILED',
        actorType: 'system',
        sessionId,
        metadata: {
          message: error?.message,
          source: 'app-movil',
        },
        severity: 'warning',
      }),
    );
    return { ok: true };
  }

  @Post(':sessionId/heartbeat')
  @ApiOperation({ summary: 'Heartbeat de unidad móvil directa' })
  async heartbeat(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: {
      appState?: 'active' | 'background' | 'inactive';
      clientTimestamp?: number;
      expectedInterval?: number;
      missedCount?: number;
      source?: string;
      timeSinceLast?: number;
    },
    @Ip() ip: string,
  ) {
    const session = await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.heartbeat(sessionId);
    await this.sessionService.updateMobileHeartbeat(sessionId, {
      appState: this.normalizeAppState(body.appState),
      source: this.normalizeLifecycleSource(body.source),
    });

    if (body.timeSinceLast && body.expectedInterval && body.timeSinceLast - body.expectedInterval > 2000) {
      await this.auditService.log({
        eventType: 'MOBILE_HEARTBEAT_DELAYED',
        actorType: 'user',
        actorId: sessionId,
        sessionId,
        qrId: session.qrId,
        metadata: {
          delayMs: body.timeSinceLast - body.expectedInterval,
          expectedInterval: body.expectedInterval,
          actualInterval: body.timeSinceLast,
          clientTimestamp: body.clientTimestamp,
        },
        severity: 'warning',
        ip,
      });
    }

    return { ok: true, message: 'Heartbeat móvil registrado' };
  }

  @Post(':sessionId/bluetooth/pairing')
  @ApiOperation({ summary: 'Registrar estado de emparejamiento Bluetooth móvil' })
  async bluetoothPairing(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: any,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updateMobileBluetooth(sessionId, body);
    await this.auditService.log({
      eventType: body.connected ? 'MOBILE_BLUETOOTH_PAIRED' : 'MOBILE_BLUETOOTH_UPDATED',
      actorType: 'user',
      sessionId,
      metadata: body,
      severity: body.connected ? 'info' : 'warning',
    });
    return { ok: true };
  }

  @Post(':sessionId/notifications/token')
  @ApiOperation({ summary: 'Registrar token push de la app móvil' })
  async notificationToken(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { token: string; provider?: string },
  ) {
    if (!body.token) {
      throw new BadRequestException('token es requerido');
    }
    await this.assertActiveSession(sessionId, mobileSessionToken);
    await this.sessionService.updateMobileNotificationToken(sessionId, body.token, body.provider || 'expo');
    return { ok: true };
  }

  @Get(':sessionId/notifications/pending')
  @ApiOperation({ summary: 'Consultar notificaciones pendientes para app movil' })
  async pendingNotifications(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Query('since') since?: string,
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    const sinceDate = since ? new Date(since) : undefined;
    const notifications = await this.notificationService.getPendingPushForSession(
      sessionId,
      sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : undefined,
    );

    return {
      ok: true,
      notifications,
      serverTime: new Date().toISOString(),
    };
  }

  @Post(':sessionId/captures/camera')
  @ApiOperation({ summary: 'Recibir captura de cámara desde app móvil' })
  async saveCameraCaptureBySession(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { image: string },
  ) {
    return this.saveCameraCaptureInternal(sessionId, body.image, mobileSessionToken);
  }

  @Post(':sessionId/captures/audio')
  @ApiOperation({ summary: 'Recibir clip de audio desde app móvil' })
  async saveAudioCapture(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { audio: string },
  ) {
    if (!body.audio) {
      throw new BadRequestException('audio es requerido');
    }

    await this.assertActiveSession(sessionId, mobileSessionToken);
    this.assertThrottle(
      this.audioCaptureLastSeen,
      sessionId,
      10_000,
      'Audio enviado demasiado rápido para esta sesión',
    );

    if (!/^data:audio\/(webm|mp4|mpeg|mp3|wav|ogg|m4a);base64,/.test(body.audio)) {
      throw new BadRequestException('Formato de audio no permitido');
    }

    // Aproximadamente 10 MB en data URL para clips cortos de evidencia.
    if (body.audio.length > 14_000_000) {
      throw new BadRequestException('Audio demasiado grande');
    }

    const audioClip = await this.audioClipsService.saveAudioClip(sessionId, body.audio);
    this.realtimeGateway.server.to(sessionId).emit('new-audio-clip', {
      clipId: audioClip._id,
      url: audioClip.url,
      capturedAt: audioClip.capturedAt,
      duration: audioClip.duration,
    });
    await this.auditService.log({
      eventType: 'MOBILE_AUDIO_CAPTURE_RECEIVED',
      actorType: 'user',
      sessionId,
      metadata: {
        audioClipId: audioClip._id,
        duration: audioClip.duration,
        sizeBytes: audioClip.sizeBytes,
      },
      severity: 'info',
    });

    return {
      success: true,
      audioClip: {
        id: audioClip._id,
        url: audioClip.url,
        capturedAt: audioClip.capturedAt,
        duration: audioClip.duration,
        sizeBytes: audioClip.sizeBytes,
      },
    };
  }

  @Post(':sessionId/sensors/orientation')
  @ApiOperation({ summary: 'Recibir orientación/brújula desde app móvil' })
  async orientation(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { alpha: number; beta: number; gamma: number },
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    this.assertThrottle(
      this.sensorLastSeen,
      `${sessionId}:orientation`,
      1_000,
      'Orientación enviada demasiado rápido para esta sesión',
    );

    const alpha = this.parseFiniteNumber(body.alpha, 'alpha');
    const beta = this.parseFiniteNumber(body.beta, 'beta');
    const gamma = this.parseFiniteNumber(body.gamma, 'gamma');

    return this.liveService.handleOrientation({
      sessionId,
      alpha,
      beta,
      gamma,
    });
  }

  @Post(':sessionId/sensors/motion')
  @ApiOperation({ summary: 'Recibir acelerómetro/giroscopio desde app móvil' })
  async motion(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: {
      acceleration?: { x: number; y: number; z: number };
      rotationRate?: any;
    },
  ) {
    await this.assertActiveSession(sessionId, mobileSessionToken);
    this.assertThrottle(
      this.sensorLastSeen,
      `${sessionId}:motion`,
      1_000,
      'Movimiento enviado demasiado rápido para esta sesión',
    );

    const acceleration = this.normalizeVector3(body.acceleration, 'acceleration');
    const rotationRate = this.normalizeVector3(body.rotationRate, 'rotationRate');

    return this.liveService.handleMotion({
      sessionId,
      acceleration,
      rotationRate,
    });
  }

  @Post('captures/camera')
  @ApiOperation({ summary: 'Recibir captura de cámara desde app móvil (compatibilidad)' })
  async saveCameraCaptureLegacy(
    @Headers('x-mobile-session-token') mobileSessionToken: string,
    @Body() body: { sessionId: string; image: string },
  ) {
    return this.saveCameraCaptureInternal(body.sessionId, body.image, mobileSessionToken);
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'Finalizar sesión móvil directa' })
  async end(
    @Param('sessionId') sessionId: string,
    @Headers('x-mobile-session-token') mobileSessionToken: string,
  ) {
    if (!mobileSessionToken) {
      throw new UnauthorizedException('Token móvil requerido');
    }

    const session = await this.sessionService.getMobileSessionForStop(sessionId, mobileSessionToken);
    if (!session) {
      throw new NotFoundException('Sesión móvil no encontrada');
    }

    const alreadyEnded = session.status !== 'active';
    if (!alreadyEnded) {
      await this.sessionService.complete(sessionId);
      await this.realtimeGateway.closeSessionRooms([sessionId], 'mobile_session_ended');
    }

    await this.auditService.log({
      eventType: alreadyEnded ? 'MOBILE_SESSION_END_ALREADY_DONE' : 'MOBILE_SESSION_ENDED',
      actorType: 'user',
      sessionId,
      metadata: { source: 'app-movil', status: session.status },
      severity: 'info',
    });
    return {
      ok: true,
      alreadyEnded,
      message: alreadyEnded ? 'Sesión móvil ya estaba terminada' : 'Sesión móvil terminada',
    };
  }

  private async assertActiveSession(sessionId: string, mobileSessionToken?: string) {
    if (!mobileSessionToken) {
      throw new UnauthorizedException('Token móvil requerido');
    }

    const session = await this.sessionService.getActiveMobileSession(sessionId, mobileSessionToken);
    if (!session) {
      throw new NotFoundException('Sesión móvil activa no encontrada');
    }
    if (session.status === 'dropped') {
      await this.sessionService.heartbeat(sessionId);
      session.status = 'active';
    }
    return session;
  }

  private async saveCameraCaptureInternal(sessionId: string, image: string, mobileSessionToken?: string) {
    if (!sessionId || !image) {
      throw new BadRequestException('sessionId e image son requeridos');
    }

    await this.assertActiveSession(sessionId, mobileSessionToken);

    if (!/^data:image\/(jpeg|jpg|png);base64,/.test(image)) {
      throw new BadRequestException('Formato de imagen no permitido');
    }

    // Aproximadamente 4 MB en data URL para evitar abuso del endpoint público.
    if (image.length > 5_600_000) {
      throw new BadRequestException('Imagen demasiado grande');
    }

    const screenshot = await this.screenshotsService.saveScreenshot(
      sessionId,
      image,
      'camera',
    );
    this.realtimeGateway.server.to(sessionId).emit('new-screenshot', {
      sessionId,
      screenshotId: screenshot._id,
      thumbnailUrl: screenshot.thumbnailUrl,
      capturedAt: screenshot.capturedAt,
      type: (screenshot as any).type,
    });
    await this.auditService.log({
      eventType: 'MOBILE_CAMERA_CAPTURE_RECEIVED',
      actorType: 'user',
      sessionId,
      metadata: { type: 'camera', screenshotId: screenshot._id },
      severity: 'info',
    });

    return {
      success: true,
      screenshot: {
        id: screenshot._id,
        url: screenshot.url,
        thumbnailUrl: screenshot.thumbnailUrl,
        capturedAt: screenshot.capturedAt,
        type: (screenshot as any).type,
      },
    };
  }
}

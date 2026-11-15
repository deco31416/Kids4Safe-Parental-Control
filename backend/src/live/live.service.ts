import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { PluginModeService } from '../config/plugin-mode.service';
import { Session, SessionDocument } from '../session/session.schema';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LocationService, LocationRealtimePayload } from '../location/location.service';

export interface ConsentPayload {
  qrId: string;
  sessionId?: string;
  accepted: boolean;
  consentVersion: string;
  permissions: string[];
  purpose?: string;
}

export interface DeviceInfoPayload {
  sessionId: string;
  userAgent: string;
  timezone?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  capabilities?: Record<string, boolean>;
}

export interface OrientationPayload {
  sessionId: string;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface MotionPayload {
  sessionId: string;
  acceleration?: { x: number; y: number; z: number };
  rotationRate?: any;
}

export interface DestinationOpenedPayload {
  sessionId: string;
  destinationUrl?: string;
}

@Injectable()
export class LiveService {
  private readonly pluginEnabled: boolean;
  private readonly deviceInfoUrl: string;

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly httpService: HttpService,
    private readonly locationService: LocationService,
    private readonly configService: ConfigService,
    private readonly pluginMode: PluginModeService,
  ) {
    this.pluginEnabled = this.pluginMode.isDeviceInfoEnabled();
    this.deviceInfoUrl = this.configService.get<string>('DEVICE_INFO_URL', '');
    
    if (!this.pluginEnabled) {
      console.log('[LiveService] 🏠 DeviceInfo en modo LOCAL - sin microservicio');
    } else if (this.deviceInfoUrl) {
      console.log(`[LiveService] 🔌 DeviceInfo en modo PLUGIN → ${this.deviceInfoUrl}`);
    }
  }

  private async findSession(sessionId: string): Promise<SessionDocument | null> {
    if (Types.ObjectId.isValid(sessionId)) {
      const session = await this.sessionModel.findById(sessionId);
      if (session) return session;
    }

    return this.sessionModel.findOne({ sessionId });
  }

  /**
   * Registrar consentimiento del usuario
   * Audita y guarda en sesión
   */
  async handleConsent(payload: ConsentPayload): Promise<{ ok: boolean }> {
    const { qrId, sessionId, accepted, consentVersion, permissions, purpose } = payload;

    // 1) Auditar evento de consentimiento
    await this.auditService.log({
      eventType: accepted ? 'CONSENT_ACCEPTED' : 'CONSENT_REJECTED',
      actorType: 'user',
      qrId,
      sessionId,
      metadata: { consentVersion, permissions, purpose },
      severity: 'info',
    });

    // 2) Guardar en sesión si existe sessionId
    if (sessionId) {
      const session = await this.findSession(sessionId);
      if (session) {
        if (!session.consents) session.consents = [];
        session.consents.push({
          accepted,
          consentVersion,
          permissions,
          purpose,
          timestamp: new Date(),
        } as any);
        await session.save();
      }
    }

    console.log('[LiveService] CONSENT:', { qrId, sessionId, accepted });

    return { ok: true };
  }

  /**
   * Normalizar información de dispositivo
   * Llama a microservicio device-info, audita y guarda
   */
  async handleDeviceInfo(payload: DeviceInfoPayload): Promise<{ ok: boolean; device: any }> {
    const { sessionId, userAgent, timezone, language, platform, hardwareConcurrency, capabilities } = payload;

    try {
      const adminApiKey = this.configService.get<string>('ADMIN_API_KEY') || undefined;

      // 🏠 Modo LOCAL: sin microservicio
      if (!this.pluginEnabled || !this.deviceInfoUrl || !adminApiKey) {
        console.warn('[LiveService] DeviceInfo en modo LOCAL - guardando solo payload');
        
        // Guardar en sesión sin data del microservicio
        if (sessionId) {
          const session = await this.findSession(sessionId);
          if (session) {
            session.deviceInfo = {
              userAgent,
              platform,
              hardwareConcurrency,
              capabilities,
              collectedAt: new Date(),
              source: 'local',
            } as any;
            await session.save();
          }
        }
        
        return { ok: true, device: null };
      }
      
      // 🔌 Modo PLUGIN: llamar microservicio
      const response = await firstValueFrom(
        this.httpService.post(`${this.deviceInfoUrl}/device/analyze`, {
          session_id: sessionId,
          user_agent: userAgent,
          timezone,
          language,
          platform,
          hardware_concurrency: hardwareConcurrency,
          cap_camera: Boolean(capabilities?.camera),
          cap_mic: Boolean(capabilities?.microphone),
          cap_screen: Boolean(capabilities?.screen || capabilities?.screenShare),
          cap_geolocation: Boolean(capabilities?.location || capabilities?.geolocation),
          cap_orientation: Boolean(capabilities?.orientation),
        }, {
          headers: { 'x-api-key': adminApiKey },
        }).pipe(
          timeout(5000),
          catchError(err => {
            console.error('[LiveService] Device Info microservice error:', err.message);
            throw err;
          })
        )
      );

      const deviceData = response.data;

      // 2) Guardar en sesión
      if (sessionId) {
        const session = await this.findSession(sessionId);
        if (session) {
          session.deviceInfo = {
            ...deviceData,
            platform,
            hardwareConcurrency,
            capabilities,
            collectedAt: new Date(),
          } as any;
          await session.save();
        }
      }

      // 3) Auditar evento
      await this.auditService.log({
        eventType: 'DEVICE_INFO_COLLECTED',
        actorType: 'user',
        sessionId,
        userAgent,
        metadata: { device: deviceData, platform, capabilities },
        severity: 'info',
      });

      console.log('[LiveService] DEVICE_INFO:', { sessionId, device: deviceData });

      return { ok: true, device: deviceData };
    } catch (error) {
      console.error('[LiveService] DEVICE_INFO Error:', error.message);
      // No fallar si microservicio no disponible
      return { ok: true, device: null };
    }
  }

  /**
   * Procesar ubicación en tiempo real
   * Valida, audita, emite WebSocket y guarda
   */
  async handleLocationRealtime(payload: LocationRealtimePayload): Promise<any> {
    const { sessionId } = payload;

    if (!sessionId) {
      throw new HttpException('sessionId required', HttpStatus.BAD_REQUEST);
    }

    // 1) Validar con microservicio location-geofence
    const validated = await this.locationService.validateRealtime(payload);

    // 2) Guardar en historial
    await this.locationService.saveLocation(sessionId, validated);

    // 3) Guardar punto en ruta histórica (async)
    this.locationService.trackPoint(sessionId, validated).catch(() => {});

    // 4) Auditar evento
    await this.auditService.log({
      eventType: 'LOCATION_REALTIME_UPDATE',
      actorType: 'user',
      sessionId,
      geo: {
        latitude: validated.lat,
        longitude: validated.lng,
        city: undefined,
        country: undefined,
      },
      metadata: {
        precision: validated.precision,
        accuracy: validated.accuracy,
        confidence: validated.confidence,
        source: validated.source,
      },
      severity: 'info',
    });

    // 5) Emitir por WebSocket a Admin Panel
    this.realtimeGateway.server.to(`admin-${sessionId}`).emit('location-update', {
      sessionId,
      location: validated,
      timestamp: new Date(),
    });

    console.log('[LiveService] LOCATION_REALTIME:', {
      sessionId,
      precision: validated.precision,
      accuracy: validated.accuracy,
    });

    return {
      ok: true,
      precision: validated.precision,
      confidence: validated.confidence,
      accuracy: validated.accuracy,
    };
  }

  /**
   * Guardar orientación del dispositivo (brújula)
   */
  async handleOrientation(payload: OrientationPayload): Promise<{ ok: boolean }> {
    const { sessionId, alpha, beta, gamma } = payload;

    // Guardar en sesión (último valor)
    if (sessionId) {
      const session = await this.findSession(sessionId);
      if (session) {
        if (!session.metadata) session.metadata = {} as any;
        (session.metadata as any).lastOrientation = { alpha, beta, gamma, timestamp: new Date() };
        await session.save();
      }
    }

    console.log('[LiveService] ORIENTATION:', { sessionId, alpha, beta, gamma });

    return { ok: true };
  }

  /**
   * Guardar movimiento/aceleración
   * Detecta movimientos sospechosos
   */
  async handleMotion(payload: MotionPayload): Promise<{ ok: boolean }> {
    const { sessionId, acceleration, rotationRate } = payload;

    // 1) Guardar en sesión
    if (sessionId) {
      const session = await this.findSession(sessionId);
      if (session) {
        if (!session.metadata) session.metadata = {} as any;
        (session.metadata as any).lastMotion = { acceleration, rotationRate, timestamp: new Date() };
        await session.save();
      }
    }

    // 2) Detectar movimiento sospechoso (aceleración > 15 m/s²)
    if (acceleration) {
      const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
      if (magnitude > 15) {
        await this.auditService.log({
          eventType: 'SUSPICIOUS_MOTION_DETECTED',
          actorType: 'user',
          sessionId,
          metadata: { acceleration, magnitude },
          severity: 'warning',
        });
      }
    }

    console.log('[LiveService] MOTION:', { sessionId, acceleration });

    return { ok: true };
  }

  /**
   * Registrar cuando usuario abre URL destino
   */
  async handleDestinationOpened(payload: DestinationOpenedPayload): Promise<{ ok: boolean }> {
    const { sessionId, destinationUrl } = payload;

    // Auditar evento crítico
    await this.auditService.log({
      eventType: 'DESTINATION_OPENED',
      actorType: 'user',
      sessionId,
      metadata: { destinationUrl },
      severity: 'info',
    });

    console.log('[LiveService] DESTINATION_OPENED:', { sessionId, destinationUrl });

    return { ok: true };
  }
}

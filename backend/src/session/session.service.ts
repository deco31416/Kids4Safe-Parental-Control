import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { SessionState } from '../types/interfaces';
import { Session, SessionDocument } from './session.schema';
import { v4 as uuidv4 } from 'uuid';
import { QRService } from '../qr/qr.service';
import { OrchestratorClient } from './orchestrator.client';
import { PolicyEngineClient, EvaluatePolicyPayload, PolicyDecision } from './policy-engine.client';
import { LocalPolicyService } from './local-policy.service';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    @Inject(forwardRef(() => QRService))
    private qrService: QRService,
    private orchestrator: OrchestratorClient,
    private policyEngine: PolicyEngineClient,
    private localPolicy: LocalPolicyService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL');
    const keyPrefix = this.configService.get('REDIS_KEY_PREFIX') || undefined;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { keyPrefix });
    } else {
      this.redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        keyPrefix,
      });
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  generateSessionId(): string {
    return uuidv4();
  }

  private hashMobileSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private activeSessionCutoff(): Date | null {
    const staleMs = Number(this.configService.get('ACTIVE_SESSION_STALE_MS', 300_000));
    if (!Number.isFinite(staleMs) || staleMs <= 0) return null;
    return new Date(Date.now() - staleMs);
  }

  private droppedSessionRecoveryCutoff(): Date {
    const recoveryMs = Number(this.configService.get('PUBLISHER_DROPPED_RECOVERY_MS', 120_000));
    const safeRecoveryMs = Number.isFinite(recoveryMs) && recoveryMs > 0 ? recoveryMs : 120_000;
    return new Date(Date.now() - safeRecoveryMs);
  }

  private browserReconnectCutoff(): Date {
    const reconnectMs = Number(this.configService.get('QR_BROWSER_RECONNECT_MS', 24 * 60 * 60 * 1000));
    const safeReconnectMs = Number.isFinite(reconnectMs) && reconnectMs > 0 ? reconnectMs : 24 * 60 * 60 * 1000;
    return new Date(Date.now() - safeReconnectMs);
  }

  private async markStaleActiveSessions(qrId?: string): Promise<void> {
    const cutoff = this.activeSessionCutoff();
    if (!cutoff) return;

    const query: any = {
      status: 'active',
      $or: [
        { lastSeen: { $lt: cutoff } },
        { lastSeen: { $exists: false } },
      ],
    };
    if (qrId) query.qrId = qrId;

    await this.sessionModel.updateMany(
      query,
      {
        $set: {
          status: 'dropped',
          endTime: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    );
  }

  async getOrCreate(
    sessionId: string, 
    qrId: string, 
    qrName: string = 'Unknown',
    ipAddress: string = 'unknown',
    destinationUrl?: string,
    browserDeviceId?: string,
  ): Promise<SessionState> {
    const key = `session:${sessionId}`;
    const existing = await this.redis.get(key);

    if (existing) {
      return JSON.parse(existing);
    }

    const session: SessionState = {
      sessionId,
      qrId,
      qrName,
      status: 'active',
      deviceInfo: null,
      location: null,
      permissions: {
        camera: false,
        microphone: false,
        screen: false,
        location: false,
      },
      streams: {
        camera: false,
        microphone: false,
        screen: false,
      },
      ipAddress,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    const expiry = this.configService.get('SESSION_EXPIRY', 3600);
    await this.redis.set(key, JSON.stringify(session), 'EX', expiry);
    
    // ✅ P0 FIX: Crear sesión en MongoDB con TTL 24h
    console.log('💾 [MongoDB] Creando sesión:', sessionId, 'con status:', 'active');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    const sessionData = {
      sessionId,
      qrId,
      ...(browserDeviceId ? { browserDeviceId } : {}),
      status: 'active',
      ipAddress,
      expiresAt,
      createdAt: new Date(),
      lastSeen: new Date(),
      // 🔒 FIX: Inicializar permissions para evitar undefined en Admin Panel
      permissions: {
        camera: false,
        microphone: false,
        screen: false,
        location: false,
      },
    };
    console.log('💾 [MongoDB] Datos a guardar:', JSON.stringify(sessionData, null, 2));
    const mongoSession = await this.sessionModel.create(sessionData);
    console.log('✅ [MongoDB] Sesión creada con _id:', mongoSession._id);
    console.log('✅ [MongoDB] Status guardado:', mongoSession.status);
    console.log('✅ [MongoDB] Documento completo:', JSON.stringify(mongoSession.toObject(), null, 2));
    
    // ✅ HÍBRIDO: Crear sesión en orchestrator (Redis TTL 30s)
    this.orchestrator.createSession({
      session_id: sessionId,
      qr_id: qrId,
      destination_url: destinationUrl || 'unknown',
    }).catch(err => {
      console.warn(`⚠️ [Orchestrator] createSession falló: ${sessionId} - ${err.message}`);
    });
    
    return session;
  }

  async findReconnectableQrSession(qrId: string, browserDeviceId?: string): Promise<SessionDocument | null> {
    if (!browserDeviceId) return null;

    const cutoff = this.browserReconnectCutoff();
    return this.sessionModel
      .findOne({
        qrId,
        browserDeviceId,
        source: { $ne: 'mobile-app' },
        status: { $in: ['active', 'paused', 'dropped'] },
        $or: [
          { lastSeen: { $gte: cutoff } },
          { createdAt: { $gte: cutoff } },
        ],
      })
      .sort({ lastSeen: -1, createdAt: -1 })
      .exec();
  }

  async reconnectQrSession(
    session: SessionDocument,
    qrName: string,
    ipAddress: string = 'unknown',
    destinationUrl?: string,
  ): Promise<SessionState> {
    const now = Date.now();
    const state: SessionState = {
      sessionId: session.sessionId,
      qrId: session.qrId,
      qrName,
      status: 'active',
      deviceInfo: (session.deviceInfo as any) || null,
      location: (session.location as any) || null,
      permissions: {
        camera: session.permissions?.camera || false,
        microphone: session.permissions?.microphone || false,
        screen: session.permissions?.screen || false,
        location: session.permissions?.location || false,
      },
      streams: {
        camera: session.streams?.camera || false,
        microphone: session.streams?.microphone || false,
        screen: session.streams?.screen || false,
      },
      ipAddress,
      lastSeen: now,
      createdAt: (session as any).createdAt ? new Date((session as any).createdAt).getTime() : now,
    };

    const expiry = this.configService.get('SESSION_EXPIRY', 3600);
    await this.redis.set(`session:${session.sessionId}`, JSON.stringify(state), 'EX', expiry);

    session.status = 'active';
    session.lastSeen = new Date(now);
    session.ipAddress = ipAddress;
    session.endTime = undefined;
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await session.save();

    this.orchestrator.createSession({
      session_id: session.sessionId,
      qr_id: session.qrId,
      destination_url: destinationUrl || 'unknown',
    }).catch(err => {
      console.warn(`⚠️ [Orchestrator] reconnect createSession falló: ${session.sessionId} - ${err.message}`);
    });

    return state;
  }

  async get(sessionId: string): Promise<SessionState | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    return JSON.parse(data);
  }

  async getAdminSession(sessionId: string): Promise<any | null> {
    const session = await this.sessionModel
      .findOne({ sessionId })
      .select('sessionId qrId browserDeviceId source mobile subject status ipAddress permissions streams deviceInfo capabilities location metadata createdAt lastSeen endTime')
      .lean()
      .exec();

    return session ? this.normalizeActiveSession(session) : null;
  }

  async heartbeat(sessionId: string): Promise<SessionState> {
    const key = `session:${sessionId}`;
    let data = await this.redis.get(key);
    
    if (!data) {
      const mongoSession = await this.sessionModel
        .findOne({
          sessionId,
          status: { $in: ['active', 'dropped', 'paused'] },
        })
        .exec();

      if (!mongoSession) {
        throw new Error('Session not found');
      }

      if (mongoSession.status === 'dropped') {
        const lastSeen = mongoSession.lastSeen ? new Date(mongoSession.lastSeen) : null;
        if (!lastSeen || lastSeen < this.droppedSessionRecoveryCutoff()) {
          throw new Error('Session dropped recovery window expired');
        }
      }

      const now = Date.now();
      const recoveredState: SessionState = {
        sessionId: mongoSession.sessionId,
        qrId: mongoSession.qrId,
        qrName: (mongoSession as any).qrName || mongoSession.qrId,
        status: 'active',
        deviceInfo: (mongoSession.deviceInfo as any) || null,
        location: (mongoSession.location as any) || null,
        permissions: {
          camera: mongoSession.permissions?.camera || false,
          microphone: mongoSession.permissions?.microphone || false,
          screen: mongoSession.permissions?.screen || false,
          location: mongoSession.permissions?.location || false,
        },
        streams: {
          camera: mongoSession.streams?.camera || false,
          microphone: mongoSession.streams?.microphone || false,
          screen: mongoSession.streams?.screen || false,
        },
        ipAddress: mongoSession.ipAddress || 'unknown',
        lastSeen: now,
        createdAt: (mongoSession as any).createdAt ? new Date((mongoSession as any).createdAt).getTime() : now,
      };

      const expiry = this.configService.get('SESSION_EXPIRY', 3600);
      data = JSON.stringify(recoveredState);
      await this.redis.set(key, data, 'EX', expiry);
    }

    const session: SessionState = JSON.parse(data);
    const now = Date.now();
    session.lastSeen = now;
    session.status = 'active';

    const expiry = this.configService.get('SESSION_EXPIRY', 3600);
    await this.redis.set(key, JSON.stringify(session), 'EX', expiry);
    
    // 🔒 FIX CRÍTICO: Actualizar lastSeen en MongoDB también
    // Esto asegura que MongoDB y Redis usan el MISMO timestamp
    await this.sessionModel.updateOne(
      { sessionId },
      { 
        $set: { 
          lastSeen: new Date(now),
          status: 'active',
        },
        $unset: {
          endReason: '',
          endTime: '',
        },
      },
    ).catch(err => {
      console.warn(`⚠️ [MongoDB] Heartbeat update falló: ${sessionId} - ${err.message}`);
    });
    
    // ✅ HÍBRIDO: Renovar TTL en orchestrator (30s)
    // No bloquea el flujo - si falla el heartbeat, orchestrator marcará como dropped
    this.orchestrator.heartbeat(sessionId, {
      stream: session.streams,
      location: session.location ? {
        latitude: session.location.latitude,
        longitude: session.location.longitude,
        accuracy: session.location.accuracy,
      } : undefined,
    }).catch(err => {
      console.warn(`⚠️ [Orchestrator] Heartbeat falló: ${sessionId} - ${err.message}`);
    });
    
    return session;
  }

  async pause(sessionId: string): Promise<SessionState> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    
    if (!data) {
      throw new Error('Session not found');
    }

    const session: SessionState = JSON.parse(data);
    session.status = 'paused';
    session.lastSeen = Date.now();

    const expiry = this.configService.get('SESSION_PAUSE_EXPIRY', 86400);
    await this.redis.set(key, JSON.stringify(session), 'EX', expiry);
    
    // ✅ P0 FIX: Extender expiresAt en MongoDB (pausada: 7 días)
    await this.sessionModel.updateOne(
      { sessionId },
      { 
        status: 'paused',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    );

    await this.qrService.deactivateSession(session.qrId, sessionId);
    
    return session;
  }

  async complete(sessionId: string): Promise<SessionState> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);

    let session: SessionState | null = data ? JSON.parse(data) : null;
    if (!session) {
      const mongoSession = await this.sessionModel.findOne({ sessionId });
      if (!mongoSession) {
        throw new Error('Session not found');
      }

      const mongoSessionTimestamps = mongoSession as SessionDocument & { createdAt?: Date };
      const createdAt = mongoSessionTimestamps.createdAt instanceof Date
        ? mongoSessionTimestamps.createdAt.getTime()
        : Date.now();
      session = {
        sessionId,
        qrId: mongoSession.qrId,
        qrName: mongoSession.qrId,
        status: 'completed',
        deviceInfo: (mongoSession.deviceInfo || {}) as any,
        location: mongoSession.location
          ? {
              latitude: mongoSession.location.latitude || 0,
              longitude: mongoSession.location.longitude || 0,
              accuracy: mongoSession.location.accuracy || 0,
              timestamp: mongoSession.location.timestamp
                ? new Date(mongoSession.location.timestamp).getTime()
                : Date.now(),
            }
          : null,
        permissions: {
          camera: Boolean(mongoSession.permissions?.camera),
          microphone: Boolean(mongoSession.permissions?.microphone),
          screen: Boolean(mongoSession.permissions?.screen),
          location: Boolean(mongoSession.permissions?.location),
        },
        streams: {
          camera: Boolean(mongoSession.streams?.camera),
          microphone: Boolean(mongoSession.streams?.microphone),
          screen: Boolean(mongoSession.streams?.screen),
        },
        ipAddress: mongoSession.ipAddress || '',
        lastSeen: Date.now(),
        createdAt,
      };
    }

    session.status = 'completed';
    session.lastSeen = Date.now();

    await this.redis.set(key, JSON.stringify(session), 'EX', 86400);
    
    // ✅ P0 FIX: Extender expiresAt en MongoDB (completada: 30 días)
    await this.sessionModel.updateOne(
      { sessionId },
      { 
        status: 'completed',
        endTime: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    );
    
    // ✅ HÍBRIDO: Detener sesión en orchestrator
    this.orchestrator.stopSession(sessionId).catch(err => {
      console.warn(`⚠️ [Orchestrator] stopSession falló: ${sessionId} - ${err.message}`);
    });
    
    // ✅ Actualizar contador de sesiones activas del QR
    await this.qrService.deactivateSession(session.qrId, sessionId);
    
    return session;
  }

  async deleteSessionRecord(sessionId: string): Promise<number> {
    await this.redis.del(`session:${sessionId}`);
    const result = await this.sessionModel.deleteOne({ sessionId });
    const deletedCount = result.deletedCount || 0;

    this.logger.log(`🗑️ Sesión ${sessionId} eliminada de Redis/Mongo: ${deletedCount}`);

    return deletedCount;
  }

  async updateDeviceInfo(sessionId: string, deviceInfo: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.deviceInfo = {
      ...session.deviceInfo,
      ...deviceInfo,
      collectedAt: new Date(),
    } as any;
    if (deviceInfo?.browserDeviceId && typeof deviceInfo.browserDeviceId === 'string') {
      session.browserDeviceId = deviceInfo.browserDeviceId;
    }
    await session.save();
  }

  async markMobileSession(
    sessionId: string,
    mobile: {
      unitId: string;
      deviceLabel?: string;
      appVersion?: string;
      platform?: string;
      activationMode?: 'direct' | 'linked';
    },
  ): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.source = 'mobile-app';
    session.mobile = {
      ...session.mobile,
      ...mobile,
      activationMode: mobile.activationMode || 'direct',
      firstSeenAt: session.mobile?.firstSeenAt || new Date(),
      lastSeenAt: new Date(),
    } as any;
    await session.save();
  }

  async issueMobileSessionToken(sessionId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashMobileSessionToken(token);

    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: {
          source: 'mobile-app',
          'mobile.sessionTokenHash': tokenHash,
        },
      },
    );

    return token;
  }

  async issuePublisherSessionToken(sessionId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashMobileSessionToken(token);
    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: {
          publisherTokenHash: tokenHash,
        },
        $push: {
          publisherTokenHashes: {
            $each: [tokenHash],
            $slice: -5,
          },
        },
      },
    );
    return token;
  }

  private tokenMatchesAnyHash(token: string, hashes: Array<string | undefined | null>): boolean {
    const providedHash = this.hashMobileSessionToken(token);
    const provided = Buffer.from(providedHash, 'hex');

    return hashes.some((hash) => {
      if (!hash) return false;
      const expected = Buffer.from(hash, 'hex');
      return expected.length === provided.length && timingSafeEqual(expected, provided);
    });
  }

  async getActiveMobileSession(sessionId: string, token?: string): Promise<SessionDocument | null> {
    const session = await this.sessionModel.findOne({
      sessionId,
      status: { $in: ['active', 'dropped'] },
      source: 'mobile-app',
    });

    if (!session) return null;
    if (session.status === 'dropped') {
      const lastSeen = session.lastSeen ? new Date(session.lastSeen) : null;
      if (!lastSeen || lastSeen < this.droppedSessionRecoveryCutoff()) return null;
    }

    const expectedHash = session.mobile?.sessionTokenHash;
    if (!expectedHash || !token) return null;

    const providedHash = this.hashMobileSessionToken(token);
    const expected = Buffer.from(expectedHash, 'hex');
    const provided = Buffer.from(providedHash, 'hex');

    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return null;
    }

    return session;
  }

  async getMobileSessionForStop(sessionId: string, token?: string): Promise<SessionDocument | null> {
    const session = await this.sessionModel.findOne({
      sessionId,
      source: 'mobile-app',
    });

    if (!session) return null;

    const expectedHash = session.mobile?.sessionTokenHash;
    if (!expectedHash || !token) return null;

    return this.tokenMatchesAnyHash(token, [expectedHash]) ? session : null;
  }

  async validatePublisherSessionToken(
    sessionId: string,
    token?: string,
    allowedStatuses: Array<'active' | 'paused' | 'dropped'> = ['active'],
  ): Promise<boolean> {
    const session = await this.sessionModel
      .findOne({ sessionId })
      .select({ publisherTokenHash: 1, publisherTokenHashes: 1, status: 1, source: 1, lastSeen: 1 })
      .lean();

    const reject = (reason: string) => {
      this.logger.warn(
        `[PublisherToken] ${reason} sessionId=${sessionId} status=${session?.status || 'missing'} source=${session?.source || 'missing'} hasHash=${!!session?.publisherTokenHash} hashCount=${session?.publisherTokenHashes?.length || 0} hasToken=${!!token}`,
      );
      return false;
    };

    if (!session) return reject('SESSION_NOT_FOUND');
    if (session.source === 'mobile-app') return reject('SESSION_IS_MOBILE_APP');
    if (!allowedStatuses.includes(session.status as 'active' | 'paused' | 'dropped')) return reject('SESSION_STATUS_NOT_ALLOWED');
    if (session.status === 'dropped') {
      const lastSeen = session.lastSeen ? new Date(session.lastSeen) : null;
      if (!lastSeen || lastSeen < this.droppedSessionRecoveryCutoff()) {
        return reject('SESSION_DROPPED_TOO_OLD');
      }
    }
    if (!session.publisherTokenHash) return reject('PUBLISHER_HASH_MISSING');
    if (!token) return reject('TOKEN_MISSING');

    const acceptedHashes = [
      session.publisherTokenHash,
      ...(Array.isArray(session.publisherTokenHashes) ? session.publisherTokenHashes : []),
    ];
    if (!this.tokenMatchesAnyHash(token, acceptedHashes)) {
      return reject('TOKEN_HASH_MISMATCH');
    }

    return true;
  }

  async getActiveMobileSessionByUnit(unitId: string): Promise<SessionDocument | null> {
    return this.sessionModel
      .findOne({
        'mobile.unitId': unitId,
        source: 'mobile-app',
        status: 'active',
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async closeOtherActiveMobileSessions(unitId: string, keepSessionId: string): Promise<string[]> {
    const previousSessions = await this.sessionModel
      .find({
        'mobile.unitId': unitId,
        source: 'mobile-app',
        status: { $in: ['active', 'dropped', 'paused'] },
        sessionId: { $ne: keepSessionId },
      })
      .select({ sessionId: 1 })
      .lean();
    const previousSessionIds = previousSessions.map((session) => session.sessionId);

    if (previousSessionIds.length === 0) return [];

    await this.sessionModel.updateMany(
      {
        sessionId: { $in: previousSessionIds },
      },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    );

    await Promise.all(
      previousSessionIds.map(async (sessionId) => {
        const key = `session:${sessionId}`;
        const data = await this.redis.get(key);
        if (data) {
          const session: SessionState = JSON.parse(data);
          session.status = 'completed';
          session.lastSeen = Date.now();
          await this.redis.set(key, JSON.stringify(session), 'EX', 86400);
        }
        await this.orchestrator.stopSession(sessionId).catch(() => {});
      }),
    );

    return previousSessionIds;
  }

  async updateMobileHeartbeat(
    sessionId: string,
    lifecycle?: { appState?: 'active' | 'background' | 'inactive'; source?: string },
  ): Promise<void> {
    const set: Record<string, any> = {
      source: 'mobile-app',
      'mobile.lastSeenAt': new Date(),
    };

    if (lifecycle?.appState) {
      set['mobile.appState'] = lifecycle.appState;
    }
    if (lifecycle?.source) {
      set['mobile.lastLifecycleSource'] = lifecycle.source;
    }

    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: set,
      },
    );
  }

  async updateMobileBluetooth(sessionId: string, bluetooth: any): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: {
          source: 'mobile-app',
          'mobile.bluetooth': {
            ...bluetooth,
            updatedAt: new Date(),
          },
        },
      },
    );
  }

  async updateMobileNotificationToken(
    sessionId: string,
    token: string,
    provider: string = 'expo',
  ): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: {
          source: 'mobile-app',
          'mobile.notificationToken': {
            token,
            provider,
            updatedAt: new Date(),
          },
        },
      },
    );
  }

  async updateMobileProfileSnapshot(
    sessionId: string,
    profile: {
      avatarThumbnailUrl?: string;
      avatarUri?: string;
      bloodType?: string;
      emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
      };
      fullName?: string;
      phone?: string;
      securityId?: string;
    },
  ): Promise<void> {
    await this.sessionModel.updateOne(
      { sessionId },
      {
        $set: {
          source: 'mobile-app',
          'mobile.profile': {
            avatarThumbnailUrl: profile.avatarThumbnailUrl || '',
            avatarUri: profile.avatarUri || '',
            bloodType: profile.bloodType || '',
            emergencyContact: profile.emergencyContact || {},
            fullName: profile.fullName || '',
            phone: profile.phone || '',
            securityId: profile.securityId || '',
          },
        },
      },
    );
  }

  async addConsent(
    sessionId: string,
    consent: {
      accepted: boolean;
      consentVersion: string;
      permissions: string[];
      purpose?: string;
    },
  ): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    if (!session.consents) session.consents = [];
    session.consents.push({
      ...consent,
      timestamp: new Date(),
    } as any);
    await session.save();
  }

  async updateCapabilities(sessionId: string, capabilities: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.capabilities = capabilities;
    await session.save();
    
    console.log(`✅ [Session] Capabilities guardadas para ${sessionId}:`, {
      deviceType: capabilities.deviceType,
      hasCamera: capabilities.camera?.available,
      canScreen: capabilities.screen?.canCapture,
    });
  }

  async updateLocation(sessionId: string, location: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.location = {
      ...session.location,
      ...location,
      timestamp: new Date(),
    } as any;
    await session.save();
  }

  async updatePermissions(sessionId: string, permissions: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.permissions = {
      ...session.permissions,
      ...permissions,
    } as any;
    await session.save();
  }

  async updateStreams(sessionId: string, streams: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.streams = {
      ...session.streams,
      ...streams,
    } as any;
    await session.save();
  }

  async resume(sessionId: string): Promise<any> {
    const session = await this.sessionModel.findOne({ sessionId });
    
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'active';
    session.lastSeen = new Date();
    await session.save();
    
    return session;
  }

  async updateContentRedirect(sessionId: string, contentRedirect: any): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (!session) return;

    session.contentRedirect = contentRedirect as any;
    await session.save();
  }

  private normalizeActiveSession(session: any) {
    return {
      ...session,
      deviceCapabilities: session.capabilities ? {
        camera: {
          available: session.capabilities.camera?.available || false,
          modes: session.capabilities.camera?.modes || [],
        },
        microphone: {
          available: session.capabilities.audio?.microphone || false,
        },
        location: {
          available: session.capabilities.geolocation?.available || false,
          gpsAvailable: session.capabilities.geolocation?.accuracy === 'high',
        },
        screen: {
          canCapture: session.capabilities.screen?.canCapture || false,
        },
        noScreenCapture: !session.capabilities.screen?.canCapture,
      } : null,
    };
  }

  async getActivePage(options?: {
    limit?: string | number;
    cursor?: string;
    source?: string;
    qrId?: string;
  }): Promise<{
    sessions: any[];
    pagination: {
      limit: number;
      nextCursor: string | null;
      hasMore: boolean;
    };
  }> {
    const requestedLimit = Number(options?.limit || 100);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 250);

    await this.markStaleActiveSessions(options?.qrId);

    const query: any = { status: 'active' };
    const cutoff = this.activeSessionCutoff();
    if (cutoff) query.lastSeen = { $gte: cutoff };
    if (options?.qrId) query.qrId = options.qrId;
    if (options?.source === 'mobile-app') query.source = 'mobile-app';
    if (options?.source === 'frontend') {
      query.$or = [
        { source: { $exists: false } },
        { source: { $ne: 'mobile-app' } },
      ];
    }

    if (options?.cursor) {
      const cursorDate = new Date(options.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const sessions = await this.sessionModel
      .find(query)
      .select('sessionId qrId browserDeviceId source mobile subject status ipAddress permissions streams deviceInfo capabilities location metadata createdAt lastSeen')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = sessions.length > limit;
    const pageSessions = hasMore ? sessions.slice(0, limit) : sessions;
    const lastSession = pageSessions[pageSessions.length - 1] as any;

    return {
      sessions: pageSessions.map((session) => this.normalizeActiveSession(session)),
      pagination: {
        limit,
        nextCursor: hasMore && lastSession?.createdAt ? new Date(lastSession.createdAt).toISOString() : null,
        hasMore,
      },
    };
  }

  async getAllActive(): Promise<any[]> {
    const page = await this.getActivePage({ limit: 100 });
    return page.sessions;
  }

  async getRecentMobileEmergencies(limitInput: string | number = 50): Promise<any[]> {
    const requestedLimit = Number(limitInput || 50);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1), 200);

    await this.markStaleActiveSessions();

    const sessions = await this.sessionModel
      .find({
        source: 'mobile-app',
        status: { $in: ['active', 'completed', 'dropped', 'paused'] },
      })
      .select('sessionId qrId browserDeviceId source mobile subject status ipAddress permissions streams deviceInfo capabilities location metadata createdAt lastSeen endTime')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    return sessions.map((session) => this.normalizeActiveSession(session));
  }

  async getRecentFrontendSessions(options?: {
    limit?: string | number;
    cursor?: string;
    qrId?: string;
  }): Promise<{
    sessions: any[];
    pagination: {
      limit: number;
      nextCursor: string | null;
      hasMore: boolean;
    };
  }> {
    const requestedLimit = Number(options?.limit || 100);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 250);

    await this.markStaleActiveSessions(options?.qrId);

    const query: any = {
      status: { $in: ['active', 'dropped', 'paused'] },
      $or: [
        { source: { $exists: false } },
        { source: { $ne: 'mobile-app' } },
      ],
    };
    if (options?.qrId) query.qrId = options.qrId;

    if (options?.cursor) {
      const cursorDate = new Date(options.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const sessions = await this.sessionModel
      .find(query)
      .select('sessionId qrId browserDeviceId source mobile subject status ipAddress permissions streams deviceInfo capabilities location metadata createdAt lastSeen endTime')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = sessions.length > limit;
    const pageSessions = hasMore ? sessions.slice(0, limit) : sessions;
    const lastSession = pageSessions[pageSessions.length - 1] as any;

    return {
      sessions: pageSessions.map((session) => this.normalizeActiveSession(session)),
      pagination: {
        limit,
        nextCursor: hasMore && lastSession?.createdAt ? new Date(lastSession.createdAt).toISOString() : null,
        hasMore,
      },
    };
  }

  /**
   * Evalúa policy para una sesión
   * 
   * 1. Intenta llamar al microservicio policy-engine (timeout 2s)
   * 2. Si falla/timeout → usa fallback local
   * 3. Guarda decisión en MongoDB para auditoría
   * 
   * @returns PolicyDecision con allow_continue, reason, required_permissions
   */
  async evaluatePolicy(payload: EvaluatePolicyPayload): Promise<PolicyDecision> {
    // 1. Intentar con microservicio (timeout 2s)
    let decision = await this.policyEngine.evaluate(payload);
    let source: 'microservice' | 'local-fallback' = 'microservice';

    // 2. Fallback local si microservicio no responde
    if (!decision) {
      console.warn('⚠️ [Policy] Microservicio no disponible, usando fallback local');
      decision = this.localPolicy.evaluate(payload);
      source = 'local-fallback';
    }

    // 3. Guardar decisión en MongoDB (auditoría)
    const sessionId = payload.session_state?.sessionId;
    if (sessionId) {
      const session = await this.sessionModel.findOne({ sessionId });
      if (session) {
        session.policyDecision = {
          ...decision,
          evaluatedAt: new Date(),
          source,
        } as any;
        await session.save();
      }
    }

    return decision;
  }

  /**
   * Valida que permisos otorgados cumplan con policy
   */
  async validatePermissions(required: string[], granted: string[]): Promise<{ valid: boolean; missing: string[] }> {
    const result = await this.policyEngine.validatePermissions(required, granted);
    
    if (!result) {
      // Fallback local
      return this.localPolicy.validatePermissions(required, granted);
    }
    
    return result;
  }
}


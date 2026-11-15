import { Injectable, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { COMPARE_AND_SET_QR } from './qr-atomic';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../session/session.schema';
import { QRCode } from '../types/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QRService {
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {
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

  async create(name: string, createdBy: string = 'admin', config?: any, policies?: any): Promise<QRCode> {
    const qrId = uuidv4();
    const destinationUrl = config?.redirect_url || config?.destinationUrl || config?.redirectUrl;
    const normalizedConfig = {
      ...(config || {}),
      ...(destinationUrl ? { redirect_url: destinationUrl } : {}),
    };
    const qr: QRCode = {
      id: qrId,
      name,
      createdAt: Date.now(),
      createdBy,
      isActive: true,
      totalScans: 0,
      activeSessions: 0,
      destinationUrl,
      config: normalizedConfig,
      policies: policies || {},
    };

    await this.redis.set(`qr:${qrId}`, JSON.stringify(qr));
    await this.redis.sadd('qr:all', qrId);

    return qr;
  }

  async get(qrId: string): Promise<QRCode | null> {
    const data = await this.redis.get(`qr:${qrId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async getAll(): Promise<QRCode[]> {
    const qrIds = await this.redis.smembers('qr:all');
    const qrs: QRCode[] = [];

    for (const id of qrIds) {
      const data = await this.redis.get(`qr:${id}`);
      if (data) {
        qrs.push(JSON.parse(data));
      }
    }

    return qrs.sort((a, b) => b.createdAt - a.createdAt);
  }

  async incrementScan(qrId: string): Promise<void> {
    await this.mutate(qrId, (qr) => { qr.totalScans++; });
  }

  async reserveScan(qrId: string, countScan = true): Promise<QRCode> {
    const result = await this.mutate(qrId, (qr) => {
      if (!qr.isActive || (qr.expiresAt && qr.expiresAt < Date.now()) ||
          (qr.policies?.maxUses > 0 && qr.totalScans >= qr.policies.maxUses)) {
        throw new HttpException('QR desactivado, expirado o sin usos disponibles', HttpStatus.FORBIDDEN);
      }
      if (countScan) qr.totalScans++;
    });
    if (!result) throw new HttpException('QR no válido', HttpStatus.NOT_FOUND);
    return result;
  }

  async releaseScan(qrId: string) {
    await this.mutate(qrId, (qr) => { qr.totalScans = Math.max(0, qr.totalScans - 1); });
  }

  private async mutate(qrId: string, change: (qr: QRCode) => void): Promise<QRCode | null> {
    for (let attempt = 0; attempt < 32; attempt++) {
      const raw = await this.redis.get(`qr:${qrId}`);
      if (!raw) return null;
      const qr: QRCode = JSON.parse(raw);
      change(qr);
      const saved = await this.redis.eval(COMPARE_AND_SET_QR, 1, `qr:${qrId}`, raw, JSON.stringify(qr));
      if (saved === 1) return qr;
    }
    throw new ServiceUnavailableException('QR ocupado, vuelve a intentarlo');
  }

  private sessionsKey(qrId: string): string {
    return `qr:${qrId}:sessions`;
  }

  private activeSessionsKey(qrId: string): string {
    return `qr:${qrId}:activeSessions`;
  }

  private activeSessionCutoff(): Date | null {
    const staleMs = Number(this.configService.get('ACTIVE_SESSION_STALE_MS', 300_000));
    if (!Number.isFinite(staleMs) || staleMs <= 0) return null;
    return new Date(Date.now() - staleMs);
  }

  async updateActiveSessions(qrId: string): Promise<void> {
    const qr = await this.get(qrId);
    if (!qr) return;

    const cutoff = this.activeSessionCutoff();
    const activeQuery: any = { qrId, status: 'active' };
    if (cutoff) activeQuery.lastSeen = { $gte: cutoff };

    const activeSessionIds = await this.sessionModel.distinct('sessionId', activeQuery);
    const activeSessionIdSet = new Set(activeSessionIds);
    const activeKey = this.activeSessionsKey(qrId);
    const cachedSessionIds = await this.redis.smembers(activeKey);
    const staleCachedSessionIds = cachedSessionIds.filter((sessionId) => !activeSessionIdSet.has(sessionId));

    if (staleCachedSessionIds.length > 0) {
      await this.redis.srem(activeKey, ...staleCachedSessionIds);
    }

    if (activeSessionIds.length > 0) {
      await this.redis.sadd(activeKey, ...activeSessionIds);
    }

    await this.mutate(qrId, (current) => { current.activeSessions = activeSessionIds.length; });
  }

  async addSession(qrId: string, sessionId: string, countScan: boolean = true): Promise<void> {
    await this.redis.sadd(this.sessionsKey(qrId), sessionId);
    await this.redis.sadd(this.activeSessionsKey(qrId), sessionId);
    if (countScan) await this.incrementScan(qrId);
    await this.updateActiveSessions(qrId);
  }

  async deactivateSession(qrId: string, sessionId: string): Promise<void> {
    await this.redis.srem(this.activeSessionsKey(qrId), sessionId);
    await this.updateActiveSessions(qrId);
  }

  async getSessionsByQR(qrId: string): Promise<string[]> {
    return await this.redis.smembers(this.sessionsKey(qrId));
  }

  private normalizeSession(session: any) {
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

  async getSessionSummariesByQR(qrId: string, limitInput: string | number = 100): Promise<any[]> {
    const requestedLimit = Number(limitInput || 100);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 250);

    const sessions = await this.sessionModel
      .find({ qrId })
      .select('sessionId qrId browserDeviceId source mobile subject status ipAddress permissions streams deviceInfo capabilities location metadata createdAt lastSeen endTime')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    return sessions.map((session) => this.normalizeSession(session));
  }

  async toggleActive(qrId: string): Promise<QRCode | null> {
    return this.mutate(qrId, (qr) => { qr.isActive = !qr.isActive; });
  }

  async update(qrId: string, qrData: QRCode): Promise<QRCode | null> {
    return this.mutate(qrId, (qr) => {
      const { totalScans, activeSessions } = qr;
      Object.assign(qr, qrData, { totalScans, activeSessions });
    });
  }

  async delete(qrId: string): Promise<boolean> {
    await this.redis.del(`qr:${qrId}`);
    await this.redis.srem('qr:all', qrId);
    await this.redis.del(this.sessionsKey(qrId));
    await this.redis.del(this.activeSessionsKey(qrId));

    return true;
  }

  // ========================================================================
  // 📸 Screenshot Config (fallback store)
  // ========================================================================

  private screenshotConfigKey(qrId: string): string {
    return `qr:${qrId}:screenshotConfig`;
  }

  async getStandaloneScreenshotConfig(qrId: string): Promise<any | null> {
    const data = await this.redis.get(this.screenshotConfigKey(qrId));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async setStandaloneScreenshotConfig(qrId: string, config: any): Promise<void> {
    await this.redis.set(this.screenshotConfigKey(qrId), JSON.stringify(config));
  }

  /**
   * 🎬 Phase 6: Actualizar Capture Policy de un QR
   */
  async updateCapturePolicy(qrId: string, capturePolicy: any): Promise<QRCode | null> {
    return this.mutate(qrId, (qr) => {
      qr.config ||= {};
      qr.config.capturePolicy = { ...qr.config.capturePolicy, ...capturePolicy };
    });
  }
}


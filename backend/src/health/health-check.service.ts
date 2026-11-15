import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Connection } from 'mongoose';

@Injectable()
export class HealthCheckService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly configService: ConfigService,
  ) {}

  getRuntimeServices() {
    const get = (key: string) => this.configService.get<string>(key);
    return {
      frontend: { url: get('FRONTEND_URL'), healthPath: '/' },
      adminPanel: {
        url: get('ADMIN_URL') || get('ADMIN_PANEL_URL'),
        healthPath: '/',
      },
      mobileApp: { url: get('MOBILE_APP_URL'), healthPath: '/' },
      deviceInfo: { url: get('DEVICE_INFO_URL'), healthPath: '/health' },
      location: { url: get('LOCATION_URL'), healthPath: '/health' },
      locationTrack: { url: get('LOCATION_TRACK_URL'), healthPath: '/health' },
      screenRecorder: { url: get('SCREEN_RECORDER_URL'), healthPath: '/health' },
      auditLog: {
        url: get('AUDIT_LOG_SERVICE_URL') || get('AUDIT_LOG_URL'),
        healthPath: '/health',
      },
      policyEngine: {
        url: get('POLICY_ENGINE_SERVICE_URL') || get('POLICY_ENGINE_URL'),
        healthPath: '/health',
      },
      ipClassifier: { url: get('IP_CLASSIFIER_URL'), healthPath: '/health' },
      sessionOrchestrator: {
        url: get('SESSION_ORCHESTRATOR_SERVICE_URL') || get('SESSION_ORCHESTRATOR_URL'),
        healthPath: '/health',
      },
    };
  }

  checkBackend() {
    return {
      status: 'up',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };
  }

  async checkRedis() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return { status: 'not-configured', connected: false, configured: false };
    }

    const redis = new Redis(redisUrl, {
      connectTimeout: 2500,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
    });
    redis.on('error', () => undefined);

    try {
      await redis.ping();
      return { status: 'up', connected: true, configured: true };
    } catch (error: any) {
      return {
        status: 'down',
        connected: false,
        configured: true,
        error: error?.message || 'Redis no disponible',
      };
    } finally {
      await redis.quit().catch(() => redis.disconnect());
    }
  }

  checkMongoDB() {
    const connected = this.mongoConnection.readyState === 1;
    return {
      status: connected ? 'up' : 'down',
      connected,
      readyState: this.mongoConnection.readyState,
      name: this.mongoConnection.name,
      host: this.mongoConnection.host,
    };
  }

  async checkHttpService(service: string, url?: string, healthPath = '/health') {
    const lastCheck = () => new Date().toISOString();
    if (!url) {
      return {
        status: 'not-configured',
        service,
        error: 'URL no configurada en variables de entorno',
        lastCheck: lastCheck(),
      };
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(this.buildHealthUrl(url, healthPath), {
        signal: controller.signal,
      });
      return {
        status: response.ok ? 'up' : 'degraded',
        url,
        responseTime: Date.now() - startedAt,
        ...(!response.ok ? { httpStatus: response.status } : {}),
        lastCheck: lastCheck(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        url,
        error: error?.name === 'AbortError' ? 'Timeout' : error?.message,
        lastCheck: lastCheck(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildHealthUrl(url: string, healthPath: string) {
    const base = url.replace(/\/+$/, '');
    const path = healthPath.startsWith('/') ? healthPath : `/${healthPath}`;
    return `${base}${path}`;
  }
}

import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FALLBACK_ICE_SERVERS,
  IceServerResponse,
  isValidIceServers,
} from './ice-server.types';
import { MeteredTurnClient } from './metered-turn.client';

type CacheEntry = {
  expiresAt: number;
  value: IceServerResponse;
};

@Injectable()
export class IceServersService {
  private readonly logger = new Logger(IceServersService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<IceServerResponse>>();

  constructor(
    private readonly config: ConfigService,
    private readonly metered: MeteredTurnClient,
  ) {}

  async getIceServers(sessionKey: string): Promise<IceServerResponse> {
    const cached = this.getCached(sessionKey);
    if (cached) return cached;

    const pending = this.pending.get(sessionKey);
    if (pending) return pending;

    const request = this.resolveServers(sessionKey).finally(() => this.pending.delete(sessionKey));
    this.pending.set(sessionKey, request);
    return request;
  }

  private getCached(sessionKey: string): IceServerResponse | null {
    const entry = this.cache.get(sessionKey);
    if (!entry) return null;

    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    if (remaining <= 120) {
      this.cache.delete(sessionKey);
      return null;
    }
    return { ...entry.value, ttlSeconds: remaining };
  }

  private async resolveServers(sessionKey: string): Promise<IceServerResponse> {
    const ttlSeconds = this.getCredentialTtl();
    const value =
      (await this.metered.createEphemeral(this.createSafeLabel(sessionKey), ttlSeconds)) ||
      (await this.metered.getConfiguredServers()) ||
      this.getMeteredEnvServers() ||
      this.getEnvJsonServers() || {
        iceServers: FALLBACK_ICE_SERVERS,
        source: 'stun-fallback' as const,
        ttlSeconds: 300,
      };

    this.pruneCache();
    this.cache.set(sessionKey, {
      expiresAt: Date.now() + value.ttlSeconds * 1000,
      value,
    });
    return value;
  }

  private getCredentialTtl(): number {
    const configured = Number(this.config.get('METERED_TURN_CREDENTIAL_TTL_SECONDS') || 7200);
    return Math.min(86400, Math.max(600, configured));
  }

  private createSafeLabel(sessionKey: string): string {
    const digest = createHash('sha256').update(sessionKey).digest('hex').slice(0, 20);
    return `qr-session-${digest}`;
  }

  private getMeteredEnvServers(): IceServerResponse | null {
    const username = this.config.get<string>('METERED_TURN_USERNAME');
    const credential = this.config.get<string>('METERED_TURN_PASSWORD');
    if (!username || !credential) return null;
    return {
      iceServers: [
        { urls: 'stun:stun.relay.metered.ca:80' },
        { urls: 'turn:sa.relay.metered.ca:80', username, credential },
        { urls: 'turn:sa.relay.metered.ca:80?transport=tcp', username, credential },
        { urls: 'turn:sa.relay.metered.ca:443', username, credential },
        { urls: 'turns:sa.relay.metered.ca:443?transport=tcp', username, credential },
      ],
      source: 'metered-env',
      ttlSeconds: 300,
    };
  }

  private getEnvJsonServers(): IceServerResponse | null {
    const raw = this.config.get<string>('WEBRTC_ICE_SERVERS_JSON');
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      return isValidIceServers(payload)
        ? { iceServers: payload, source: 'env-json', ttlSeconds: 300 }
        : null;
    } catch {
      this.logger.warn('WEBRTC_ICE_SERVERS_JSON no es JSON valido');
      return null;
    }
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size >= 500) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
  }
}

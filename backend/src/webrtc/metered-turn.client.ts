import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IceServerResponse,
  isValidIceServers,
} from './ice-server.types';

type CreatedCredential = {
  apiKey?: string;
  expiryInSeconds?: number;
  iceServers?: unknown;
};

@Injectable()
export class MeteredTurnClient {
  private readonly logger = new Logger(MeteredTurnClient.name);

  constructor(private readonly config: ConfigService) {}

  async createEphemeral(label: string, ttlSeconds: number): Promise<IceServerResponse | null> {
    const appName = this.config.get<string>('METERED_TURN_APP_NAME');
    const secretKey = this.config.get<string>('METERED_TURN_SECRET_KEY');
    if (!appName || !secretKey) return null;

    try {
      const url = new URL(`https://${appName}.metered.live/api/v1/turn/credential`);
      url.searchParams.set('secretKey', secretKey);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryInSeconds: ttlSeconds, label }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.logger.warn(`Metered credential creation failed: HTTP ${response.status}`);
        return null;
      }

      const credential = await response.json() as CreatedCredential;
      const effectiveTtl = this.normalizeTtl(credential.expiryInSeconds, ttlSeconds);
      if (isValidIceServers(credential.iceServers)) {
        return { iceServers: credential.iceServers, source: 'metered-ephemeral', ttlSeconds: effectiveTtl };
      }
      if (!credential.apiKey) return null;
      return this.fetchServers(appName, credential.apiKey, 'metered-ephemeral', effectiveTtl);
    } catch (error: any) {
      this.logger.warn(`Metered credential creation unavailable: ${error?.message || error}`);
      return null;
    }
  }

  async getConfiguredServers(): Promise<IceServerResponse | null> {
    const appName = this.config.get<string>('METERED_TURN_APP_NAME');
    const apiKey = this.config.get<string>('METERED_TURN_CREDENTIAL_API_KEY');
    if (!appName || !apiKey) return null;
    return this.fetchServers(appName, apiKey, 'metered-api', 300);
  }

  private async fetchServers(
    appName: string,
    apiKey: string,
    source: 'metered-ephemeral' | 'metered-api',
    ttlSeconds: number,
  ): Promise<IceServerResponse | null> {
    try {
      const url = new URL(`https://${appName}.metered.live/api/v1/turn/credentials`);
      url.searchParams.set('apiKey', apiKey);
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        this.logger.warn(`Metered ICE lookup failed: HTTP ${response.status}`);
        return null;
      }
      const payload = await response.json();
      return isValidIceServers(payload)
        ? { iceServers: payload, source, ttlSeconds }
        : null;
    } catch (error: any) {
      this.logger.warn(`Metered ICE lookup unavailable: ${error?.message || error}`);
      return null;
    }
  }

  private normalizeTtl(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
  }
}

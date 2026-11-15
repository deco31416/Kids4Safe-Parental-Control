import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageUrlService } from './storage-url.service';

type SavedFrame = {
  bytes: number;
  filename: string;
  sha256: string;
  storage_key: string;
};

@Injectable()
export class ScreenRecorderClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService, private readonly urls: StorageUrlService) {
    this.baseUrl = (config.get<string>('SCREEN_RECORDER_URL') || 'http://localhost:5003').replace(/\/$/, '');
    this.apiKey = config.get<string>('ADMIN_API_KEY') || '';
  }

  async save(sessionId: string, frameData: string, frameType: 'screen' | 'camera') {
    const saved = await this.request<SavedFrame>('/api/save-frame', {
      method: 'POST',
      body: JSON.stringify({
        frame_data: frameData,
        frame_type: frameType,
        session_id: sessionId,
        timestamp: Date.now(),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      bytes: saved.bytes,
      contentType: 'image/jpeg',
      key: saved.storage_key,
      sha256: saved.sha256,
      url: this.urls.create(saved.storage_key, 'screen-media'),
    };
  }

  async read(key: string) {
    const { sessionId, filename } = this.parseKey(key);
    const response = await this.fetch(`/api/frames/${encodeURIComponent(sessionId)}/${encodeURIComponent(filename)}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string) {
    const { sessionId, filename } = this.parseKey(key);
    await this.request(`/api/frames/${encodeURIComponent(sessionId)}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  }

  async deleteSession(sessionId: string) {
    this.validateSegment(sessionId);
    await this.request(`/api/frames/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  }

  private async request<T = unknown>(route: string, init?: RequestInit): Promise<T> {
    const response = await this.fetch(route, init);
    return response.json() as Promise<T>;
  }

  private async fetch(route: string, init?: RequestInit) {
    try {
      const response = await fetch(`${this.baseUrl}${route}`, {
        ...init,
        headers: { ...init?.headers, 'X-API-Key': this.apiKey },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`screen-recorder HTTP ${response.status}`);
      return response;
    } catch (error) {
      throw new ServiceUnavailableException(error instanceof Error ? error.message : 'screen-recorder no disponible');
    }
  }

  private parseKey(key: string) {
    const parts = key.split('/');
    if (parts.length !== 2) throw new Error('Frame key inválida');
    parts.forEach((part) => this.validateSegment(part));
    return { sessionId: parts[0], filename: parts[1] };
  }

  private validateSegment(value: string) {
    if (!/^[A-Za-z0-9._:-]+$/.test(value) || value.includes('..')) throw new Error('Segmento de frame inválido');
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class StorageUrlService {
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly ttl: number;

  constructor(config: ConfigService) {
    const port = config.get<string>('PORT') || '7000';
    this.baseUrl = (config.get<string>('BACKEND_PUBLIC_URL') || `http://localhost:${port}`).replace(/\/$/, '');
    this.secret = config.get<string>('MEDIA_SIGNING_SECRET') || config.get<string>('JWT_SECRET') || '';
    if (this.secret.length < 32) throw new Error('Secreto de firma multimedia no configurado');
    this.ttl = Number(config.get('MEDIA_URL_TTL_SECONDS') || 3600);
    if (!Number.isSafeInteger(this.ttl) || this.ttl < 60 || this.ttl > 86400) throw new Error('MEDIA_URL_TTL_SECONDS inválido');
  }

  create(key: string, route = 'media'): string {
    const token = Buffer.from(key, 'utf8').toString('base64url');
    const expires = String(Math.floor(Date.now() / 1000) + this.ttl);
    return `${this.baseUrl}/${route}/${token}?expires=${expires}&signature=${this.sign(`${route}:${token}:${expires}`)}`;
  }

  verify(token: string, signature?: string, expires?: string, route = 'media'): string {
    if (!expires || !/^\d{1,12}$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Enlace multimedia expirado');
    }
    this.verifySignature(`${route}:${token}:${expires}`, signature);
    return this.decode(token);
  }

  // Only call when presenting an already-authorized persisted record. Old links
  // can be renewed here; public media endpoints always require an expiry.
  refresh(url: string): string {
    try {
      const value = new URL(url);
      const base = new URL(this.baseUrl);
      if (value.origin !== base.origin) return url;
      const match = /^\/(media|screen-media)\/([A-Za-z0-9_-]+)$/.exec(value.pathname);
      if (!match) return url;
      const [, route, token] = match;
      const expires = value.searchParams.get('expires');
      this.verifySignature(expires ? `${route}:${token}:${expires}` : token, value.searchParams.get('signature') || undefined);
      return this.create(this.decode(token), route);
    } catch {
      return url;
    }
  }

  private decode(token: string) {
    if (!/^[A-Za-z0-9_-]{1,4096}$/.test(token)) throw new UnauthorizedException('Archivo inválido');
    const key = Buffer.from(token, 'base64url').toString('utf8');
    if (!key || Buffer.from(key).toString('base64url') !== token) throw new UnauthorizedException('Archivo inválido');
    return key;
  }

  private verifySignature(value: string, signature?: string) {
    if (!signature) throw new UnauthorizedException('Firma de archivo ausente');
    const expected = Buffer.from(this.sign(value));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Firma de archivo inválida');
    }
  }

  private sign(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('base64url');
  }
}

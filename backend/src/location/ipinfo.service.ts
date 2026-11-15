import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IpInfoResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string; // "latitude,longitude"
  org?: string; // ISP/Organization
  postal?: string;
  timezone?: string;
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  company?: {
    name: string;
    domain: string;
    type: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
    service: string;
  };
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  };
  domains?: {
    ip: string;
    total: number;
    domains: string[];
  };
}

/**
 * Servicio para integración con ipinfo.io API
 * 
 * @description
 * Proporciona información detallada de geolocalización basada en IP usando ipinfo.io.
 * Incluye datos de ciudad, región, país, coordenadas GPS, ISP, timezone, y detección
 * de VPN/Proxy/Tor para análisis forense.
 * 
 * @see https://ipinfo.io/developers
 * @requires IPINFO_API_TOKEN en .env
 */
@Injectable()
export class IpInfoService {
  private readonly logger = new Logger(IpInfoService.name);
  private readonly apiToken: string;
  private readonly baseUrl = 'https://ipinfo.io';
  private readonly timeout = 5000; // 5 segundos

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getString(obj: Record<string, unknown>, key: string): string | undefined {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private isAbortError(error: unknown): boolean {
    return this.isRecord(error) && error['name'] === 'AbortError';
  }

  private extractIpInfoApiError(raw: unknown): string | undefined {
    if (!this.isRecord(raw)) return undefined;

    // ipinfo a veces responde con { error: { title, message } }
    const errorField = raw['error'];
    if (typeof errorField === 'string') return errorField;
    if (this.isRecord(errorField)) {
      const title = this.getString(errorField, 'title');
      const message = this.getString(errorField, 'message');
      if (title && message) return `${title}: ${message}`;
      return message || title;
    }

    return this.getString(raw, 'message') || this.getString(raw, 'error');
  }

  private parseIpInfoResponse(raw: unknown): IpInfoResponse {
    if (!this.isRecord(raw)) {
      throw new HttpException('ipinfo.io retornó un payload no JSON/object', HttpStatus.BAD_GATEWAY);
    }

    const apiError = this.extractIpInfoApiError(raw);
    const ip = this.getString(raw, 'ip');

    if (!ip) {
      throw new HttpException(apiError || 'ipinfo.io no retornó el campo ip', HttpStatus.BAD_GATEWAY);
    }

    // Validación mínima: ip requerido. El resto del payload es opcional.
    return raw as unknown as IpInfoResponse;
  }

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>('IPINFO_API_TOKEN') || '';
    
    if (!this.apiToken) {
      this.logger.warn('⚠️ IPINFO_API_TOKEN no configurado - usando modo limitado');
    }
  }

  /**
   * Obtiene información detallada de geolocalización para una IP
   * 
   * @param ip - Dirección IP a consultar (IPv4 o IPv6)
   * @returns Objeto con información de geolocalización
   * @throws Error si la API falla o el timeout se alcanza
   * 
   * @example
   * ```typescript
   * const info = await ipInfoService.getLocationFromIP('8.8.8.8');
   * console.log(info.city, info.country, info.loc); // "Mountain View", "US", "37.4056,-122.0775"
   * ```
   */
  async getLocationFromIP(ip: string): Promise<IpInfoResponse> {
    try {
      this.logger.log(`📍 Consultando ipinfo.io para IP: ${ip}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/${ip}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Solo agregar Authorization si tenemos token
      if (this.apiToken) {
        headers['Authorization'] = `Bearer ${this.apiToken}`;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const details = await this.safeReadText(response);
        this.logger.warn(`⚠️ ipinfo.io HTTP ${response.status} ${response.statusText} ${details ? `- ${details}` : ''}`);
        throw new HttpException('ipinfo.io API error', HttpStatus.BAD_GATEWAY);
      }

      const raw: unknown = await response.json();
      const data = this.parseIpInfoResponse(raw);

      this.logger.log(`✅ ipinfo.io respuesta: ${data.city}, ${data.region}, ${data.country} (${data.loc})`);

      return data;
    } catch (error) {
      if (this.isAbortError(error)) {
        this.logger.error(`⏱️ Timeout consultando ipinfo.io para IP: ${ip}`);
        throw new HttpException('Timeout al consultar ipinfo.io', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`❌ Error consultando ipinfo.io: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Obtiene información detallada incluyendo detección de VPN/Proxy
   * 
   * @param ip - Dirección IP a consultar
   * @returns Objeto con información extendida (requiere plan de pago)
   * 
   * @example
   * ```typescript
   * const info = await ipInfoService.getEnhancedInfo('8.8.8.8');
   * if (info.privacy?.vpn) {
   *   console.log('⚠️ VPN detectado');
   * }
   * ```
   */
  async getEnhancedInfo(ip: string): Promise<IpInfoResponse> {
    try {
      this.logger.log(`🔍 Consultando información extendida para IP: ${ip}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/${ip}?privacy=1&asn=1&company=1&domains=1`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (this.apiToken) {
        headers['Authorization'] = `Bearer ${this.apiToken}`;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fallback a info básica si no tiene plan de pago
        if (response.status === 403 || response.status === 429) {
          this.logger.warn('⚠️ Plan básico detectado - usando getLocationFromIP()');
          return this.getLocationFromIP(ip);
        }

        const details = await this.safeReadText(response);
        this.logger.warn(`⚠️ ipinfo.io (enhanced) HTTP ${response.status} ${response.statusText} ${details ? `- ${details}` : ''}`);
        throw new HttpException('ipinfo.io API error', HttpStatus.BAD_GATEWAY);
      }

      const raw: unknown = await response.json();
      const data = this.parseIpInfoResponse(raw);

      // Log detección de VPN/Proxy
      if (data.privacy) {
        const threats = [];
        if (data.privacy.vpn) threats.push('VPN');
        if (data.privacy.proxy) threats.push('Proxy');
        if (data.privacy.tor) threats.push('Tor');
        if (data.privacy.hosting) threats.push('Hosting');

        if (threats.length > 0) {
          this.logger.warn(`🚨 Amenazas detectadas para ${ip}: ${threats.join(', ')}`);
        }
      }

      return data;
    } catch (error) {
      if (this.isAbortError(error)) {
        this.logger.error(`⏱️ Timeout consultando ipinfo.io extendido para IP: ${ip}`);
        throw new HttpException('Timeout al consultar ipinfo.io', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`❌ Error consultando ipinfo.io extendido: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Parsea las coordenadas GPS del campo "loc"
   * 
   * @param loc - String en formato "latitude,longitude"
   * @returns Objeto { latitude, longitude } o null si no válido
   * 
   * @example
   * ```typescript
   * const coords = ipInfoService.parseCoordinates("37.4056,-122.0775");
   * console.log(coords); // { latitude: 37.4056, longitude: -122.0775 }
   * ```
   */
  parseCoordinates(loc?: string): { latitude: number; longitude: number } | null {
    if (!loc || !loc.includes(',')) {
      return null;
    }

    const [latStr, lonStr] = loc.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }

  /**
   * Verifica si una IP está usando VPN/Proxy/Tor
   * 
   * @param ip - Dirección IP a verificar
   * @returns true si se detecta VPN/Proxy/Tor/Hosting, false si no, null si no hay datos
   * 
   * @example
   * ```typescript
   * const isThreat = await ipInfoService.isVpnOrProxy('8.8.8.8');
   * if (isThreat) {
   *   // Bloquear o marcar sesión con riesgo alto
   * }
   * ```
   */
  async isVpnOrProxy(ip: string): Promise<boolean | null> {
    try {
      const info = await this.getEnhancedInfo(ip);

      if (!info.privacy) {
        return null; // No hay información de privacidad (plan básico)
      }

      return (
        info.privacy.vpn ||
        info.privacy.proxy ||
        info.privacy.tor ||
        info.privacy.hosting
      );
    } catch (error) {
      this.logger.error(`❌ Error verificando VPN/Proxy: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene el ISP/Organization de una IP
   * 
   * @param ip - Dirección IP a consultar
   * @returns Nombre del ISP/Organization o null
   * 
   * @example
   * ```typescript
   * const isp = await ipInfoService.getISP('8.8.8.8');
   * console.log(isp); // "AS15169 Google LLC"
   * ```
   */
  async getISP(ip: string): Promise<string | null> {
    try {
      const info = await this.getLocationFromIP(ip);
      return info.org || null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo ISP: ${error.message}`);
      return null;
    }
  }
}

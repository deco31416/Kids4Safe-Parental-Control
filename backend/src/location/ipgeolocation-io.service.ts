import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IpGeolocationIoResponse {
  ip: string;
  hostname?: string;
  location?: {
    continent_code?: string;
    continent_name?: string;
    country_code2?: string;
    country_code3?: string;
    country_name?: string;
    country_name_official?: string;
    country_capital?: string;
    state_prov?: string;
    state_code?: string;
    district?: string;
    city?: string;
    locality?: string;
    accuracy_radius?: string;
    confidence?: 'High' | 'Medium' | 'Low';
    dma_code?: string;
    zipcode?: string;
    latitude?: string;
    longitude?: string;
    is_eu?: boolean;
    country_flag?: string;
    geoname_id?: string;
    country_emoji?: string;
  };
  country_metadata?: {
    calling_code?: string;
    tld?: string;
    languages?: string[];
  };
  network?: {
    asn?: {
      as_number?: string;
      organization?: string;
      country?: string;
      asn_name?: string;
      type?: string;
      domain?: string;
    };
    connection_type?: string;
    company?: {
      name?: string;
      type?: string;
      domain?: string;
    };
  };
  currency?: {
    code?: string;
    name?: string;
    symbol?: string;
  };
  security?: {
    threat_score?: number;
    is_tor?: boolean;
    is_proxy?: boolean;
    proxy_type?: string;
    proxy_provider?: string;
    is_anonymous?: boolean;
    is_known_attacker?: boolean;
    is_spam?: boolean;
    is_bot?: boolean;
    is_cloud_provider?: boolean;
    cloud_provider?: string;
  };
  time_zone?: {
    name?: string;
    offset?: number;
    offset_with_dst?: number;
    current_time?: string;
    current_time_unix?: number;
    is_dst?: boolean;
    dst_savings?: number;
    dst_exists?: boolean;
  };
}

/**
 * Servicio para integración con ipgeolocation.io API
 * 
 * @description
 * API de geolocalización IP con planes gratuitos y de pago.
 * Plan Free: 30,000 requests/mes + ciudad + país + coordenadas + currency
 * Plan Standard: +hostname + network (ASN, ISP) + timezone
 * Plan Advanced: +security (VPN/Proxy/Tor) + abuse contacts + DMA code
 * 
 * Ventajas:
 * - 30k req/mes gratis (suficiente para fallback)
 * - Ciudad precisa con confidence score
 * - Detección VPN/Proxy/Tor/Bot (plan Advanced)
 * - Threat score 0-100
 * - Timezone con DST info
 * 
 * @see https://ipgeolocation.io/documentation/ip-geolocation-api.html
 * @requires IPGEOLOCATION_IO_API_KEY en .env
 */
@Injectable()
export class IpGeolocationIoService {
  private readonly logger = new Logger(IpGeolocationIoService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.ipgeolocation.io/ipgeo';
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

  private parseIpGeolocationIoResponse(raw: unknown): IpGeolocationIoResponse {
    if (!this.isRecord(raw)) {
      throw new HttpException('ipgeolocation.io retornó un payload no JSON/object', HttpStatus.BAD_GATEWAY);
    }

    // Algunos errores vienen como { message: "..." } u otros campos.
    const maybeMessage = this.getString(raw, 'message') || this.getString(raw, 'error');
    const ip = this.getString(raw, 'ip');

    if (!ip) {
      throw new HttpException(
        maybeMessage || 'ipgeolocation.io no retornó el campo ip',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Validación mínima: ip requerido. El resto del payload es opcional.
    return raw as unknown as IpGeolocationIoResponse;
  }

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('IPGEOLOCATION_IO_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn('⚠️ IPGEOLOCATION_IO_API_KEY no configurado - servicio deshabilitado');
    }
  }

  /**
   * Obtiene información básica de geolocalización (plan Free)
   * 
   * @param ip - Dirección IP a consultar (IPv4 o IPv6)
   * @returns Objeto con información de geolocalización
   * @throws Error si la API falla o no hay API key
   * 
   * @example
   * ```typescript
   * const info = await ipGeolocationIoService.getLocationFromIP('8.8.8.8');
   * console.log(info.location.city, info.location.country_name);
   * // "Mountain View", "United States"
   * ```
   */
  async getLocationFromIP(ip: string): Promise<IpGeolocationIoResponse> {
    if (!this.apiKey) {
      throw new Error('IPGEOLOCATION_IO_API_KEY no configurado');
    }

    try {
      this.logger.log(`📍 Consultando ipgeolocation.io para IP: ${ip}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Plan Free: campos básicos
      const url = `${this.baseUrl}?apiKey=${this.apiKey}&ip=${ip}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const details = await this.safeReadText(response);
        this.logger.warn(`⚠️ ipgeolocation.io HTTP ${response.status} ${response.statusText} ${details ? `- ${details}` : ''}`);
        throw new HttpException('ipgeolocation.io API error', HttpStatus.BAD_GATEWAY);
      }

      const raw: unknown = await response.json();
      const data = this.parseIpGeolocationIoResponse(raw);

      this.logger.log(
        `✅ ipgeolocation.io respuesta: ${data.location?.city}, ${data.location?.state_prov}, ${data.location?.country_name} (${data.location?.latitude},${data.location?.longitude})`
      );

      return data;
    } catch (error) {
      if (this.isAbortError(error)) {
        this.logger.error(`⏱️ Timeout consultando ipgeolocation.io para IP: ${ip}`);
        throw new HttpException('Timeout al consultar ipgeolocation.io', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`❌ Error consultando ipgeolocation.io: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Obtiene información extendida con security info (plan Advanced)
   * 
   * @param ip - Dirección IP a consultar
   * @returns Objeto con información extendida (VPN/Proxy/Tor detection)
   * 
   * @example
   * ```typescript
   * const info = await ipGeolocationIoService.getEnhancedInfo('8.8.8.8');
   * if (info.security?.is_proxy) {
   *   console.log('⚠️ VPN/Proxy detectado');
   * }
   * ```
   */
  async getEnhancedInfo(ip: string): Promise<IpGeolocationIoResponse> {
    if (!this.apiKey) {
      throw new Error('IPGEOLOCATION_IO_API_KEY no configurado');
    }

    try {
      this.logger.log(`🔍 Consultando ipgeolocation.io (enhanced) para IP: ${ip}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Plan Advanced: incluir security, hostname, timezone
      const url = `${this.baseUrl}?apiKey=${this.apiKey}&ip=${ip}&include=security,hostnameFallbackLive,time_zone`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si falla enhanced, fallback a básico
        if (response.status === 403 || response.status === 429) {
          this.logger.warn('⚠️ Plan Free detectado - usando getLocationFromIP()');
          return this.getLocationFromIP(ip);
        }

        const details = await this.safeReadText(response);
        this.logger.warn(`⚠️ ipgeolocation.io (enhanced) HTTP ${response.status} ${response.statusText} ${details ? `- ${details}` : ''}`);
        throw new HttpException('ipgeolocation.io API error', HttpStatus.BAD_GATEWAY);
      }

      const raw: unknown = await response.json();
      const data = this.parseIpGeolocationIoResponse(raw);

      // Log detección de amenazas
      if (data.security) {
        const threats = [];
        if (data.security.is_proxy) threats.push(`Proxy (${data.security.proxy_type || 'Unknown'})`);
        if (data.security.is_tor) threats.push('Tor');
        if (data.security.is_bot) threats.push('Bot');
        if (data.security.is_spam) threats.push('Spam');
        if (data.security.is_known_attacker) threats.push('Attacker');

        if (threats.length > 0) {
          this.logger.warn(`🚨 ipgeolocation.io detectó amenazas para ${ip}: ${threats.join(', ')} (threat_score: ${data.security.threat_score})`);
        }
      }

      return data;
    } catch (error) {
      if (this.isAbortError(error)) {
        this.logger.error(`⏱️ Timeout consultando ipgeolocation.io extendido para IP: ${ip}`);
        throw new HttpException('Timeout al consultar ipgeolocation.io', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`❌ Error consultando ipgeolocation.io extendido: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Parsea las coordenadas del objeto location
   * 
   * @param location - Objeto location de la respuesta API
   * @returns Objeto { latitude, longitude } o null si no válido
   */
  parseCoordinates(location?: IpGeolocationIoResponse['location']): { latitude: number; longitude: number } | null {
    if (!location || !location.latitude || !location.longitude) {
      return null;
    }

    const latitude = parseFloat(location.latitude);
    const longitude = parseFloat(location.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }

  /**
   * Verifica si una IP está usando VPN/Proxy/Tor
   * 
   * @param ip - Dirección IP a verificar
   * @returns true si se detecta amenaza, false si no, null si no hay datos
   * 
   * @requires Plan Advanced
   */
  async isVpnOrProxy(ip: string): Promise<boolean | null> {
    try {
      const info = await this.getEnhancedInfo(ip);

      if (!info.security) {
        return null; // No hay información de seguridad (plan Free)
      }

      return (
        info.security.is_proxy === true ||
        info.security.is_tor === true ||
        info.security.is_anonymous === true
      );
    } catch (error) {
      this.logger.error(`❌ Error verificando VPN/Proxy: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene el threat score de una IP (0-100)
   * 
   * @param ip - Dirección IP a consultar
   * @returns Threat score (0=seguro, 100=máxima amenaza) o null
   * 
   * @requires Plan Advanced
   */
  async getThreatScore(ip: string): Promise<number | null> {
    try {
      const info = await this.getEnhancedInfo(ip);
      return info.security?.threat_score ?? null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo threat score: ${error.message}`);
      return null;
    }
  }
}

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

export interface IpApiResponse {
  query: string;
  status: 'success' | 'fail';
  message?: string;
  continent?: string;
  continentCode?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  district?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  offset?: number;
  currency?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  reverse?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

/**
 * Servicio para integración con ip-api.com
 * 
 * @description
 * API gratuita de geolocalización IP sin necesidad de API key.
 * Límite: 45 requests por minuto por IP.
 * 
 * Ventajas:
 * - No requiere API key
 * - Ciudad precisa (diferencia Cúcuta vs Bucaramanga)
 * - Coordenadas GPS, timezone, ISP
 * - Detección básica de VPN/Proxy/Hosting
 * 
 * Limitaciones:
 * - 45 req/min (suficiente para fallback)
 * - Sin HTTPS en plan gratuito
 * - Sin detección avanzada de amenazas
 * 
 * @see https://ip-api.com/docs/api:json
 */
@Injectable()
export class IpApiService {
  private readonly logger = new Logger(IpApiService.name);
  private readonly baseUrl = 'http://ip-api.com/json';
  private readonly timeout = 5000; // 5 segundos
  private readonly fields = 'status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,mobile,proxy,hosting,query';

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getString(obj: Record<string, unknown>, key: string): string | undefined {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumber(obj: Record<string, unknown>, key: string): number | undefined {
    const value = obj[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private getBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
    const value = obj[key];
    return typeof value === 'boolean' ? value : undefined;
  }

  private parseIpApiResponse(raw: unknown): IpApiResponse {
    if (!this.isRecord(raw)) {
      throw new HttpException('ip-api.com retornó un payload no JSON/object', HttpStatus.BAD_GATEWAY);
    }

    const status = this.getString(raw, 'status');
    const query = this.getString(raw, 'query');

    if (status !== 'success' && status !== 'fail') {
      throw new HttpException('ip-api.com retornó un status inválido', HttpStatus.BAD_GATEWAY);
    }

    if (!query) {
      throw new HttpException('ip-api.com no retornó el campo query', HttpStatus.BAD_GATEWAY);
    }

    const message = this.getString(raw, 'message');

    return {
      query,
      status,
      message,
      continent: this.getString(raw, 'continent'),
      continentCode: this.getString(raw, 'continentCode'),
      country: this.getString(raw, 'country'),
      countryCode: this.getString(raw, 'countryCode'),
      region: this.getString(raw, 'region'),
      regionName: this.getString(raw, 'regionName'),
      city: this.getString(raw, 'city'),
      district: this.getString(raw, 'district'),
      zip: this.getString(raw, 'zip'),
      lat: this.getNumber(raw, 'lat'),
      lon: this.getNumber(raw, 'lon'),
      timezone: this.getString(raw, 'timezone'),
      offset: this.getNumber(raw, 'offset'),
      currency: this.getString(raw, 'currency'),
      isp: this.getString(raw, 'isp'),
      org: this.getString(raw, 'org'),
      as: this.getString(raw, 'as'),
      asname: this.getString(raw, 'asname'),
      reverse: this.getString(raw, 'reverse'),
      mobile: this.getBoolean(raw, 'mobile'),
      proxy: this.getBoolean(raw, 'proxy'),
      hosting: this.getBoolean(raw, 'hosting'),
    };
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

  /**
   * Obtiene información de geolocalización para una IP
   * 
   * @param ip - Dirección IP a consultar (IPv4 o IPv6)
   * @returns Objeto con información de geolocalización
   * @throws Error si la API falla o retorna status='fail'
   * 
   * @example
   * ```typescript
   * const info = await ipApiService.getLocationFromIP('8.8.8.8');
   * console.log(info.city, info.country); // "Mountain View", "United States"
   * ```
   */
  async getLocationFromIP(ip: string): Promise<IpApiResponse> {
    try {
      this.logger.log(`📍 Consultando ip-api.com para IP: ${ip}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // URL con campos específicos para reducir bandwidth
      const url = `${this.baseUrl}/${ip}?fields=${this.fields}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const details = await this.safeReadText(response);
        this.logger.warn(`⚠️ ip-api.com HTTP ${response.status} ${response.statusText} ${details ? `- ${details}` : ''}`);
        throw new HttpException('ip-api.com API error', HttpStatus.BAD_GATEWAY);
      }

      const raw: unknown = await response.json();
      const data = this.parseIpApiResponse(raw);

      // Verificar si la API retornó error
      if (data.status === 'fail') {
        throw new HttpException(
          `ip-api.com query failed: ${data.message || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`✅ ip-api.com respuesta: ${data.city}, ${data.regionName}, ${data.country} (${data.lat},${data.lon})`);

      // Log detección de VPN/Proxy
      if (data.proxy || data.hosting) {
        const threats = [];
        if (data.proxy) threats.push('Proxy');
        if (data.hosting) threats.push('Hosting');
        this.logger.warn(`⚠️ ip-api.com detectó: ${threats.join(', ')} para IP ${ip}`);
      }

      return data;
    } catch (error) {
      if (this.isAbortError(error)) {
        this.logger.error(`⏱️ Timeout consultando ip-api.com para IP: ${ip}`);
        throw new HttpException('Timeout al consultar ip-api.com', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`❌ Error consultando ip-api.com: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Verifica si una IP está usando VPN/Proxy/Hosting
   * 
   * @param ip - Dirección IP a verificar
   * @returns true si se detecta proxy/hosting, false si no, null si error
   * 
   * @example
   * ```typescript
   * const isThreat = await ipApiService.isVpnOrProxy('8.8.8.8');
   * if (isThreat) {
   *   // Marcar sesión con riesgo alto
   * }
   * ```
   */
  async isVpnOrProxy(ip: string): Promise<boolean | null> {
    try {
      const info = await this.getLocationFromIP(ip);
      return info.proxy === true || info.hosting === true;
    } catch (error) {
      this.logger.error(`❌ Error verificando VPN/Proxy: ${error.message}`);
      return null;
    }
  }

  /**
   * Verifica el rate limit actual (usando header X-Rl)
   * 
   * @param ip - Dirección IP a consultar
   * @returns Número de requests restantes en la ventana actual, o null si error
   * 
   * @description
   * ip-api.com retorna headers:
   * - X-Rl: Requests restantes (0-45)
   * - X-Ttl: Segundos hasta reset de ventana
   * 
   * Si X-Rl es 0, debes esperar X-Ttl segundos antes de hacer más requests.
   */
  async checkRateLimit(ip: string): Promise<{ remaining: number; ttl: number } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseUrl}/${ip}?fields=status`;
      const response = await fetch(url, { signal: controller.signal });

      clearTimeout(timeoutId);

      const remaining = parseInt(response.headers.get('X-Rl') || '0', 10);
      const ttl = parseInt(response.headers.get('X-Ttl') || '0', 10);

      this.logger.log(`📊 ip-api.com rate limit: ${remaining}/45 requests restantes, reset en ${ttl}s`);

      return { remaining, ttl };
    } catch (error) {
      this.logger.error(`❌ Error verificando rate limit: ${error.message}`);
      return null;
    }
  }
}

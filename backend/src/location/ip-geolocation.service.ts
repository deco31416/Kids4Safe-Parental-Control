import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map, timeout } from 'rxjs/operators';
import { firstValueFrom, of } from 'rxjs';
import { PluginModeService } from '../config/plugin-mode.service';
import { IpInfoService } from './ipinfo.service';
import { IpGeolocationIoService } from './ipgeolocation-io.service';
import { IpApiService } from './ip-api.service';

/**
 * 🌍 IP GEOLOCATION SERVICE
 * ==========================
 * 
 * Obtiene ubicación precisa a partir de IP pública usando ipinfo.io + fallback a APIs gratuitas.
 * 
 * Funcionalidad:
 * - 🥇 PRIORIDAD 1: ipinfo.io (con token, datos premium: VPN/Proxy detection, ASN, Company)
 * - 🥈 PRIORIDAD 2: Microservicio IP Classifier (APIs gratuitas en cascada)
 * - 🥉 PRIORIDAD 3: Fallback local (timezone-based)
 * 
 * APIs Usadas:
 * 1. ipinfo.io (PRINCIPAL, requiere IPINFO_API_TOKEN)
 * 2. ip-api.com (FALLBACK, 45 req/min, sin key)
 * 3. ipapi.co (FALLBACK, 1000 req/día, sin key)
 * 
 * Puerto Microservicio: 5009
 * Endpoint: POST /geolocate
 */

export interface IPLocationResult {
  // IP
  ip: string;
  
  // Location
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  
  // Coordinates
  lat: number;
  lng: number;
  accuracy: number; // En metros
  
  // Additional Info
  timezone?: string;
  isp?: string;
  asn?: string;
  
  // Security Info (ipinfo.io premium)
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
  isHosting?: boolean;
  
  // Metadata
  provider: string; // ipinfo.io | ip-api.com | ipapi.co | fallback
  confidence: 'high' | 'medium' | 'low';
  source: 'api' | 'fallback';
}

@Injectable()
export class IPGeolocationService {
  private readonly logger = new Logger(IPGeolocationService.name);
  private readonly classifierUrl: string;
  private readonly timeout: number = 5000; // 5 segundos
  private readonly pluginEnabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly pluginMode: PluginModeService,
    private readonly ipInfoService: IpInfoService,
    private readonly ipGeolocationIoService: IpGeolocationIoService,
    private readonly ipApiService: IpApiService,
  ) {
    this.classifierUrl = this.configService.get<string>(
      'IP_CLASSIFIER_URL',
      'http://localhost:5009',
    );
    this.pluginEnabled = this.pluginMode.isIpClassifierEnabled();
    
    this.logger.log('🌍 IPGeolocation Multi-Tier Strategy:');
    this.logger.log('  🥇 Tier 1: ipinfo.io (premium VPN/Proxy detection)');
    this.logger.log('  🥈 Tier 2: ipgeolocation.io (30k req/mes)');
    this.logger.log('  🥉 Tier 3: ip-api.com (45 req/min, gratis)');
    this.logger.log('  🏠 Tier 4: Fallback local (timezone-based)');
  }

  /**
   * Obtiene ubicación desde IP usando estrategia multi-tier:
   * 1. ipinfo.io (premium con VPN/Proxy detection)
   * 2. ipgeolocation.io (30k req/mes, con threat score)
   * 3. ip-api.com (45 req/min, gratis)
   * 4. Fallback local (timezone-based)
   */
  async getLocationFromIP(
    ip: string,
    timezone?: string,
    language?: string,
  ): Promise<IPLocationResult> {
    // 🥇 TIER 1: Intentar ipinfo.io primero (premium)
    try {
      const ipInfoResult = await this.ipInfoService.getEnhancedInfo(ip);
      const coords = this.ipInfoService.parseCoordinates(ipInfoResult.loc);

      if (coords && ipInfoResult.city) {
        this.logger.log(
          `✅ [Tier 1] ipinfo.io SUCCESS: ${ip} → ${ipInfoResult.city}, ${ipInfoResult.country}`,
        );

        return {
          ip,
          city: ipInfoResult.city,
          region: ipInfoResult.region,
          country: ipInfoResult.country,
          country_code: ipInfoResult.country,
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: 5000, // ipinfo.io da ciudad-level (5km aprox)
          timezone: ipInfoResult.timezone,
          isp: ipInfoResult.org,
          asn: ipInfoResult.asn?.asn,
          isVpn: ipInfoResult.privacy?.vpn,
          isProxy: ipInfoResult.privacy?.proxy,
          isTor: ipInfoResult.privacy?.tor,
          isHosting: ipInfoResult.privacy?.hosting,
          provider: 'ipinfo.io',
          confidence: 'high',
          source: 'api',
        };
      }
    } catch (error) {
      this.logger.warn(`⚠️ [Tier 1] ipinfo.io FAILED: ${error.message}`);
    }

    // 🥈 TIER 2: Intentar ipgeolocation.io (30k req/mes)
    try {
      const ipGeoIoResult = await this.ipGeolocationIoService.getEnhancedInfo(ip);
      const coords = this.ipGeolocationIoService.parseCoordinates(ipGeoIoResult.location);

      if (coords && ipGeoIoResult.location?.city) {
        this.logger.log(
          `✅ [Tier 2] ipgeolocation.io SUCCESS: ${ip} → ${ipGeoIoResult.location.city}, ${ipGeoIoResult.location.country_name}`,
        );

        return {
          ip,
          city: ipGeoIoResult.location.city,
          region: ipGeoIoResult.location.state_prov,
          country: ipGeoIoResult.location.country_name,
          country_code: ipGeoIoResult.location.country_code2,
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: ipGeoIoResult.location.accuracy_radius ? parseInt(ipGeoIoResult.location.accuracy_radius) * 1000 : 5000,
          timezone: ipGeoIoResult.time_zone?.name,
          isp: ipGeoIoResult.network?.company?.name,
          asn: ipGeoIoResult.network?.asn?.as_number,
          isVpn: ipGeoIoResult.security?.is_proxy,
          isProxy: ipGeoIoResult.security?.is_proxy,
          isTor: ipGeoIoResult.security?.is_tor,
          isHosting: ipGeoIoResult.security?.is_cloud_provider,
          provider: 'ipgeolocation.io',
          confidence: ipGeoIoResult.location.confidence?.toLowerCase() as 'high' | 'medium' | 'low' || 'medium',
          source: 'api',
        };
      }
    } catch (error) {
      this.logger.warn(`⚠️ [Tier 2] ipgeolocation.io FAILED: ${error.message}`);
    }

    // 🥉 TIER 3: Intentar ip-api.com (45 req/min, gratis)
    try {
      const ipApiResult = await this.ipApiService.getLocationFromIP(ip);

      if (ipApiResult.status === 'success' && ipApiResult.city && ipApiResult.lat && ipApiResult.lon) {
        this.logger.log(
          `✅ [Tier 3] ip-api.com SUCCESS: ${ip} → ${ipApiResult.city}, ${ipApiResult.country}`,
        );

        return {
          ip,
          city: ipApiResult.city,
          region: ipApiResult.regionName,
          country: ipApiResult.country,
          country_code: ipApiResult.countryCode,
          lat: ipApiResult.lat,
          lng: ipApiResult.lon,
          accuracy: 5000, // ip-api.com da ciudad-level
          timezone: ipApiResult.timezone,
          isp: ipApiResult.isp,
          asn: ipApiResult.as,
          isVpn: ipApiResult.proxy,
          isProxy: ipApiResult.proxy,
          isTor: false,
          isHosting: ipApiResult.hosting,
          provider: 'ip-api.com',
          confidence: 'medium',
          source: 'api',
        };
      }
    } catch (error) {
      this.logger.warn(`⚠️ [Tier 3] ip-api.com FAILED: ${error.message}`);
    }

    // 🏠 TIER 4: Fallback local (timezone-based)
    this.logger.warn(`⚠️ [Tier 4] Usando fallback local para IP: ${ip}`);
    return this.getFallbackLocation(ip, timezone);
  }

  /**
   * Calcula confidence basado en datos disponibles
   */
  private calculateConfidence(data: any): 'high' | 'medium' | 'low' {
    if (data.city && data.lat && data.lng && data.provider === 'ip-api.com') {
      return 'high';
    } else if (data.city && data.lat && data.lng) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Fallback: Ubicación aproximada por timezone
   */
  private getFallbackLocation(
    ip: string,
    timezone?: string,
  ): IPLocationResult {
    const timezoneToLocation: Record<string, Partial<IPLocationResult>> = {
      'America/Bogota': {
        city: 'Bogotá',
        region: 'Bogotá D.C.',
        country: 'Colombia',
        country_code: 'CO',
        lat: 4.711,
        lng: -74.0721,
        accuracy: 50000, // ~50km
      },
      'America/New_York': {
        city: 'New York',
        country: 'United States',
        country_code: 'US',
        lat: 40.7128,
        lng: -74.006,
        accuracy: 100000,
      },
      'America/Los_Angeles': {
        city: 'Los Angeles',
        country: 'United States',
        country_code: 'US',
        lat: 34.0522,
        lng: -118.2437,
        accuracy: 100000,
      },
      'Europe/Madrid': {
        city: 'Madrid',
        country: 'Spain',
        country_code: 'ES',
        lat: 40.4168,
        lng: -3.7038,
        accuracy: 100000,
      },
    };

    const fallback = timezone && timezoneToLocation[timezone];

    if (fallback) {
      this.logger.warn(
        `Using timezone fallback for ${ip}: ${timezone} → ${fallback.city}`,
      );

      return {
        ip,
        ...fallback,
        lat: fallback.lat!,
        lng: fallback.lng!,
        accuracy: fallback.accuracy!,
        provider: 'timezone-fallback',
        confidence: 'low',
        source: 'fallback',
      };
    }

    // Ultimate fallback: ubicación por defecto (Colombia)
    this.logger.warn(`Using ultimate fallback for ${ip}`);

    return {
      ip,
      city: 'Unknown',
      country: 'Unknown',
      country_code: 'XX',
      lat: 0,
      lng: 0,
      accuracy: 10000000, // Mundo entero
      provider: 'fallback',
      confidence: 'low',
      source: 'fallback',
    };
  }

  /**
   * Valida coordenadas GPS
   */
  isValidGPSCoordinates(coords: {
    lat: number;
    lng: number;
    accuracy: number;
  }): boolean {
    return (
      coords &&
      typeof coords.lat === 'number' &&
      typeof coords.lng === 'number' &&
      coords.lat >= -90 &&
      coords.lat <= 90 &&
      coords.lng >= -180 &&
      coords.lng <= 180 &&
      coords.accuracy > 0
    );
  }

  /**
   * Calcula distancia entre dos puntos (Haversine)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

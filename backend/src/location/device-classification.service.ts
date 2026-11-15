import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map, timeout } from 'rxjs/operators';
import { firstValueFrom, of } from 'rxjs';
import { PluginModeService } from '../config/plugin-mode.service';

/**
 * 📱💻 DEVICE CLASSIFICATION SERVICE
 * ===================================
 * 
 * Clasifica el dispositivo del cliente usando el microservicio IP Classifier.
 * 
 * Funcionalidad:
 * - Detecta tipo de dispositivo (mobile/desktop/tablet/bot)
 * - Extrae IP pública real (considera proxies)
 * - Detecta tipo de red (mobile/broadband)
 * - Identifica OS, browser, device model
 * 
 * Puerto Microservicio: 5009
 * Endpoint: POST /collect
 */

export interface DeviceClassification {
  // IP Information
  ip_public: string;
  ip_version: 'IPv4' | 'IPv6' | 'unknown';
  
  // Device Classification
  device_type: 'mobile' | 'desktop' | 'tablet' | 'bot' | 'unknown';
  device_brand?: string;
  device_model?: string;
  
  // OS Information
  os: string;
  os_version?: string;
  
  // Browser Information
  browser: string;
  browser_version?: string;
  
  // Network Classification
  network_type: 'mobile' | 'broadband' | 'unknown';
  
  // Flags
  is_mobile: boolean;
  is_tablet: boolean;
  is_pc: boolean;
  is_bot: boolean;
  
  // Metadata
  confidence: 'high' | 'medium' | 'low';
  source: 'classifier' | 'fallback';
  timestamp: string;
}

@Injectable()
export class DeviceClassificationService {
  private readonly logger = new Logger(DeviceClassificationService.name);
  private readonly classifierUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number = 3000; // 3 segundos
  private readonly pluginEnabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly pluginMode: PluginModeService,
  ) {
    this.classifierUrl = this.configService.get<string>(
      'IP_CLASSIFIER_URL',
      'http://localhost:5009',
    );
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY') || undefined;
    this.pluginEnabled = this.pluginMode.isIpClassifierEnabled();
    
    if (!this.pluginEnabled) {
      this.logger.log('🏠 DeviceClassification en modo LOCAL - usando User-Agent parsing');
    } else {
      this.logger.log(`🔌 DeviceClassification en modo PLUGIN → ${this.classifierUrl}`);
    }
  }

  /**
   * Clasifica el dispositivo del cliente usando el microservicio
   */
  async classify(req: any): Promise<DeviceClassification> {
    // 🏠 Modo LOCAL: fallback inmediato si plugin desactivado
    if (!this.pluginEnabled) {
      return this.getFallbackClassification(req);
    }
    if (!this.apiKey) {
      this.logger.error(
        'IP Classifier habilitado sin ADMIN_API_KEY; usando fallback local',
      );
      return this.getFallbackClassification(req);
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.classifierUrl}/collect`, {}, {
            headers: {
              'x-api-key': this.apiKey,
              'User-Agent': req.headers['user-agent'] || 'unknown',
              // Express resuelve req.ip usando el proxy de confianza configurado.
              // No reenviar X-Forwarded-For controlado directamente por el cliente.
              'X-Client-IP': req.ip || 'unknown',
            },
          })
          .pipe(
            timeout(this.timeout),
            map((res) => ({
              ...res.data,
              confidence: 'high' as const,
              source: 'classifier' as const,
            })),
            catchError((error) => {
              this.logger.error(`Classifier error: ${error.message}`);
              return of(this.getFallbackClassification(req));
            }),
          ),
      );

      this.logger.log(
        `Device classified: ${response.device_type} (${response.os})`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Classification failed: ${error.message}`);
      return this.getFallbackClassification(req);
    }
  }

  /**
   * Fallback: Clasificación básica usando solo User-Agent
   * Se usa cuando el microservicio no está disponible
   */
  private getFallbackClassification(req: any): DeviceClassification {
    const ua = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile/i.test(ua);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua);
    const isBot = /bot|crawler|spider|slurp/i.test(ua);

    let device_type: DeviceClassification['device_type'] = 'unknown';
    if (isBot) device_type = 'bot';
    else if (isMobile) device_type = 'mobile';
    else if (isTablet) device_type = 'tablet';
    else if (ua) device_type = 'desktop';

    const classification: DeviceClassification = {
      ip_public: this.extractIPFallback(req),
      ip_version: 'IPv4',
      device_type,
      os: this.detectOS(ua),
      browser: this.detectBrowser(ua),
      network_type: isMobile ? 'mobile' : 'broadband',
      is_mobile: isMobile,
      is_tablet: isTablet,
      is_pc: !isMobile && !isTablet && !isBot,
      is_bot: isBot,
      confidence: 'low',
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(
      `Using fallback classification: ${device_type} (confidence: low)`,
    );

    return classification;
  }

  /**
   * Extrae IP del request (fallback simple)
   */
  private extractIPFallback(req: any): string {
    return req.ip || 'unknown';
  }

  /**
   * Detecta OS desde User-Agent
   */
  private detectOS(ua: string): string {
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  /**
   * Detecta Browser desde User-Agent
   */
  private detectBrowser(ua: string): string {
    if (/edg/i.test(ua)) return 'Edge';
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/safari/i.test(ua)) return 'Safari';
    if (/firefox/i.test(ua)) return 'Firefox';
    return 'Unknown';
  }

  /**
   * Decide si usar GPS o IP Geolocation
   */
  shouldUseGPS(classification: DeviceClassification): boolean {
    return (
      classification.device_type === 'mobile' ||
      classification.device_type === 'tablet'
    );
  }

  /**
   * Decide si usar IP Geolocation
   */
  shouldUseIPGeolocation(classification: DeviceClassification): boolean {
    return classification.device_type === 'desktop';
  }
}

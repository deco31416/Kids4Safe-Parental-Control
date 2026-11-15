import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceClassificationService } from './device-classification.service';
import { IPGeolocationService } from './ip-geolocation.service';
import { LocationHistoryService, LocationPoint } from './location-history.service';
import { GeoCorrelationService } from './geo-correlation.service';
import { Session, SessionDocument } from '../session/session.schema';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SessionService } from '../session/session.service';

/**
 * 🌍 LOCATION CONTROLLER - Sistema Híbrido
 * ==========================================
 * 
 * Estrategia de Geolocalización Adaptativa:
 * 
 * 📱 MÓVIL/TABLET:
 *    1. Usar GPS (si disponible)
 *    2. Validar con IP geolocation
 *    3. Fallback a IP si GPS no disponible
 * 
 * 💻 DESKTOP:
 *    1. Usar SOLO IP geolocation
 *    2. Validar con timezone
 * 
 * Resultado:
 * - Móvil en Cúcuta: GPS preciso (15m)
 * - Desktop en Cúcuta: IP preciso (2km) - ciudad correcta
 */

interface HybridLocationPayload {
  // GPS data (opcional, solo móvil)
  gps?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  
  // Context data
  timezone?: string;
  language?: string;
}

@Controller('location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(
    private readonly deviceClassificationService: DeviceClassificationService,
    private readonly ipGeolocationService: IPGeolocationService,
    private readonly locationHistoryService: LocationHistoryService,
    private readonly geoCorrelationService: GeoCorrelationService,
    private readonly sessionService: SessionService,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {}

  /**
   * POST /location/hybrid
   * 
   * Sistema híbrido de geolocalización:
   * - Móvil: GPS (si disponible) + IP fallback
   * - Desktop: IP Geolocation solamente
   * 
   * Resuelve el problema:
   * ❌ ANTES: Desktop en Cúcuta → ISP en Bucaramanga (150km error)
   * ✅ AHORA: Desktop en Cúcuta → IP geolocation precisa (2km)
   */
  @Post('hybrid')
  async hybridLocation(
    @Body() body: HybridLocationPayload,
    @Req() req: any,
  ) {
    try {
      // 1. Clasificar dispositivo
      const classification = await this.deviceClassificationService.classify(req);

      this.logger.log(
        `Hybrid location request: ${classification.device_type} (${classification.os})`,
      );

      // 2. Estrategia según dispositivo
      if (
        classification.device_type === 'mobile' ||
        classification.device_type === 'tablet'
      ) {
        // =============================
        // MÓVIL/TABLET: Priorizar GPS
        // =============================
        
        if (
          body.gps &&
          this.ipGeolocationService.isValidGPSCoordinates(body.gps)
        ) {
          // GPS disponible y válido
          this.logger.log(
            `Using GPS: ${body.gps.lat}, ${body.gps.lng} (accuracy: ${body.gps.accuracy}m)`,
          );

          // Obtener IP location para validación cruzada
          const ipLocation = await this.ipGeolocationService.getLocationFromIP(
            classification.ip_public,
            body.timezone,
            body.language,
          );

          // Calcular distancia GPS vs IP
          const distance = this.ipGeolocationService.calculateDistance(
            body.gps.lat,
            body.gps.lng,
            ipLocation.lat,
            ipLocation.lng,
          );

          const isConsistent = distance < 100; // < 100km es consistente

          if (!isConsistent) {
            this.logger.warn(
              `GPS/IP inconsistency detected: ${distance.toFixed(2)}km apart`,
            );
          }

          return {
            success: true,
            location: {
              lat: body.gps.lat,
              lng: body.gps.lng,
              accuracy: body.gps.accuracy,
              source: 'gps',
              confidence: body.gps.accuracy <= 50 ? 'high' : 'medium',
            },
            ip_location: {
              lat: ipLocation.lat,
              lng: ipLocation.lng,
              city: ipLocation.city,
              country: ipLocation.country,
              source: 'ip',
              provider: ipLocation.provider,
            },
            device: {
              type: classification.device_type,
              os: classification.os,
              browser: classification.browser,
              ip: classification.ip_public,
            },
            validation: {
              gps_ip_distance_km: parseFloat(distance.toFixed(2)),
              is_consistent: isConsistent,
              confidence: isConsistent ? 'high' : 'medium',
            },
          };
        } else {
          // GPS no disponible, usar IP
          this.logger.log('GPS not available, using IP geolocation');

          const ipLocation = await this.ipGeolocationService.getLocationFromIP(
            classification.ip_public,
            body.timezone,
            body.language,
          );

          return {
            success: true,
            location: {
              lat: ipLocation.lat,
              lng: ipLocation.lng,
              accuracy: ipLocation.accuracy,
              city: ipLocation.city,
              country: ipLocation.country,
              source: 'ip',
              confidence: ipLocation.confidence,
              provider: ipLocation.provider,
            },
            device: {
              type: classification.device_type,
              os: classification.os,
              browser: classification.browser,
              ip: classification.ip_public,
            },
            note: 'GPS not available, using IP geolocation',
          };
        }
      } else {
        // =============================
        // DESKTOP: Usar SOLO IP Geolocation
        // =============================
        
        this.logger.log('Desktop detected, using IP geolocation');

        const ipLocation = await this.ipGeolocationService.getLocationFromIP(
          classification.ip_public,
          body.timezone,
          body.language,
        );

        return {
          success: true,
          location: {
            lat: ipLocation.lat,
            lng: ipLocation.lng,
            accuracy: ipLocation.accuracy,
            city: ipLocation.city,
            region: ipLocation.region,
            country: ipLocation.country,
            country_code: ipLocation.country_code,
            timezone: ipLocation.timezone,
            source: 'ip',
            confidence: ipLocation.confidence,
            provider: ipLocation.provider,
          },
          device: {
            type: classification.device_type,
            os: classification.os,
            browser: classification.browser,
            ip: classification.ip_public,
          },
          note: `Desktop detected: using IP-based geolocation. City: ${ipLocation.city}`,
        };
      }
    } catch (error) {
      this.logger.error(`Hybrid location error: ${error.message}`, error.stack);
      
      throw new HttpException(
        {
          success: false,
          error: 'Location service error',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /location/assess-desktop
   * 
   * Estimación de ubicación para DESKTOP/LAPTOP usando multi-signal fusion.
   * Combina:
   * - IP geolocation (ciudad aproximada)
   * - Network metrics (RTT multi-punto, latencias)
   * - Timezone correlation
   * - Trilateration RTT-based
   * 
   * PRECISIÓN: 50-200 km en mejor caso.
   * NO es GPS. Transparente con el usuario.
   */
  @Post('assess-desktop')
  async assessDesktopLocation(
    @Body() body: {
      sessionId: string;
      networkMetrics: {
        webrtcRttMs: { server: string; rtt: number }[];
        wsRttMs: number;
        httpTtfbMs: number;
        jitterMs: number;
        packetLossEstimate: number;
        connectionType?: string;
        downlink?: number;
        rtt?: number;
        timezone: string;
        timezoneOffset: number;
        language: string;
        measuredAt: number;
      };
    },
    @Req() req: any,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    if (!await this.sessionService.validatePublisherSessionToken(body.sessionId, publisherToken, ['active', 'dropped'])) {
      throw new UnauthorizedException('Credencial de sesión requerida');
    }
    try {
      this.logger.log(`📍 Desktop assessment - Session: ${body.sessionId}`);
      
      // 1. Clasificar dispositivo
      const classification = await this.deviceClassificationService.classify(req);
      
      // 2. Obtener IP location
      const ipLocation = await this.ipGeolocationService.getLocationFromIP(
        classification.ip_public,
        body.networkMetrics.timezone,
        body.networkMetrics.language,
      );
      
      // 3. Fusionar señales con GeoCorrelationService
      const assessment = await this.geoCorrelationService.correlate(
        ipLocation,
        body.networkMetrics,
        classification.device_type,
      );
      
      this.logger.log(
        `✅ Assessment complete: ${assessment.estimatedCity || 'Unknown'}, ` +
        `Confidence=${assessment.confidenceScore}%, ` +
        `Method=${assessment.method}, ` +
        `Flags=${assessment.flags.join(',')}`,
      );
      
      // 🆕 3.5. Detectar saltos geográficos sospechosos
      let geographicJumpDetected = false;
      try {
        const session = await this.sessionModel.findOne({ sessionId: body.sessionId });
        if (session && session.geoHistory && session.geoHistory.length > 0) {
          const lastAssessment = session.geoHistory[session.geoHistory.length - 1];
          
          // Verificar si hay coordenadas en ambos assessments
          if (
            lastAssessment.estimatedLat &&
            lastAssessment.estimatedLng &&
            assessment.estimatedLat &&
            assessment.estimatedLng
          ) {
            const distance = this.geoCorrelationService.haversineDistance(
              lastAssessment.estimatedLat,
              lastAssessment.estimatedLng,
              assessment.estimatedLat,
              assessment.estimatedLng,
            );
            
            const timeDiff = Date.now() - new Date(lastAssessment.processedAt).getTime();
            const timeDiffMinutes = timeDiff / (1000 * 60);
            
            // Salto geográfico irreal: >500 km en <5 minutos
            if (distance > 500 && timeDiffMinutes < 5) {
              geographicJumpDetected = true;
              assessment.flags.push('impossible_geographic_jump');
              assessment.confidenceScore = Math.max(0, assessment.confidenceScore - 30);
              
              this.logger.warn(
                `🚨 SALTO GEOGRÁFICO IRREAL DETECTADO: ` +
                `${distance.toFixed(0)}km en ${timeDiffMinutes.toFixed(1)}min ` +
                `(${lastAssessment.estimatedCity} → ${assessment.estimatedCity})`
              );
            }
          }
        }
      } catch (jumpError) {
        this.logger.warn(`⚠️ Error detectando salto geográfico: ${jumpError.message}`);
      }
      
      // 4. Guardar assessment en sesión MongoDB + agregar a historial
      try {
        await this.sessionModel.findOneAndUpdate({ sessionId: body.sessionId }, {
          geoAssessment: assessment,
          $push: {
            geoHistory: {
              estimatedLat: assessment.estimatedLat,
              estimatedLng: assessment.estimatedLng,
              estimatedCity: assessment.estimatedCity,
              confidenceScore: assessment.confidenceScore,
              method: assessment.method,
              processedAt: new Date(),
            },
          },
        });
        this.logger.log(`💾 GeoAssessment guardado en sesión ${body.sessionId}`);
      } catch (saveError) {
        this.logger.warn(`⚠️ Error guardando assessment: ${saveError.message}`);
        // No fallar el request si no se puede guardar
      }
      
      return {
        success: true,
        assessment,
        geographicJumpDetected,
        classification: {
          device_type: classification.device_type,
          os: classification.os,
          browser: classification.browser,
          ip_public: classification.ip_public,
        },
      };
      
    } catch (error) {
      this.logger.error(`❌ Desktop assessment error: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          error: 'Assessment failed',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /location/device
   * 
   * Endpoint para obtener solo la clasificación del dispositivo
   * Útil para debugging y testing
   */
  @Post('device')
  async classifyDevice(@Req() req: any) {
    try {
      const classification = await this.deviceClassificationService.classify(req);
      
      return {
        success: true,
        device: classification,
        recommendations: {
          use_gps: this.deviceClassificationService.shouldUseGPS(classification),
          use_ip_geolocation: this.deviceClassificationService.shouldUseIPGeolocation(classification),
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Device classification error',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========== LOCATION HISTORY (GPS Tracking) ==========

  /**
   * POST /location/track
   * 
   * Agregar punto de ubicación al historial (público)
   * Frontend envía ubicación cada 10-15s
   */
  @Public()
  @Post('track')
  async trackLocation(
    @Body() payload: LocationPoint,
    @Headers('x-publisher-session-token') publisherToken?: string,
  ) {
    const isValid = await this.sessionService.validatePublisherSessionToken(
      payload.sessionId,
      publisherToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Publisher token inválido o ausente');
    }

    const location = await this.locationHistoryService.addLocation(payload);
    
    return {
      success: true,
      isSignificantMove: location.isSignificantMove,
      distanceFromPrevious: location.distanceFromPrevious,
    };
  }

  /**
   * GET /location/history/:sessionId
   * 
   * Obtener historial completo de una sesión
   */
  @Get('history/:sessionId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sessions')
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    const history = await this.locationHistoryService.getSessionHistory(sessionId);
    
    return {
      success: true,
      total: history.length,
      history,
    };
  }

  /**
   * GET /location/movements/:sessionId
   * 
   * Obtener solo movimientos significativos (>50m)
   */
  @Get('movements/:sessionId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sessions')
  async getSignificantMovements(@Param('sessionId') sessionId: string) {
    const movements = await this.locationHistoryService.getSignificantMovements(sessionId);
    
    return {
      success: true,
      total: movements.length,
      movements,
    };
  }

  /**
   * GET /location/stats/:sessionId
   * 
   * Obtener estadísticas de movimiento de una sesión
   */
  @Get('stats/:sessionId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_sessions')
  async getMovementStats(@Param('sessionId') sessionId: string) {
    const stats = await this.locationHistoryService.getMovementStats(sessionId);
    
    return {
      success: true,
      stats,
    };
  }

  /**
   * GET /location/qr-history/:qrId
   * 
   * Obtener historial de todas las sesiones de un QR
   */
  @Get('qr-history/:qrId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_qrs')
  async getQRHistory(@Param('qrId') qrId: string) {
    const history = await this.locationHistoryService.getQRHistory(qrId);
    
    return {
      success: true,
      total: history.length,
      history,
    };
  }
}

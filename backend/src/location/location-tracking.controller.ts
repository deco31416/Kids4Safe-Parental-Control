import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { LocationTrackingService, TrackLocationDto, LocationSource, DeviceType } from './location-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

/**
 * 🛰️ LOCATION TRACKING CONTROLLER
 * =================================
 * 
 * API endpoints para tracking de ubicaciones en tiempo real
 * 
 * Endpoints:
 * - POST /location-tracking/track - Registrar nueva ubicación
 * - GET /location-tracking/history/:sessionId - Obtener historial completo
 * - GET /location-tracking/route/:sessionId - Obtener ruta simplificada
 * - GET /location-tracking/stats/:sessionId - Obtener estadísticas
 * 
 * Todos los endpoints requieren autenticación JWT
 */

@Controller('location-tracking')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationTrackingController {
  private readonly logger = new Logger(LocationTrackingController.name);

  constructor(
    private readonly locationTrackingService: LocationTrackingService,
  ) {}

  /**
   * 📍 POST /location-tracking/track
   * 
   * Registrar nueva ubicación GPS/IP
   * 
   * Body ejemplo (Móvil GPS):
   * {
   *   "sessionId": "sess_123",
   *   "qrId": "qr_456",
   *   "latitude": 4.6512345,
   *   "longitude": -74.0587654,
   *   "accuracy": 15,
   *   "altitude": 2640,
   *   "heading": 45,
   *   "speed": 1.5,
   *   "source": "GPS_NATIVE",
   *   "confidence": "HIGH",
   *   "city": "Bogotá",
   *   "country": "Colombia",
   *   "deviceType": "mobile"
   * }
   * 
   * Body ejemplo (Desktop IP):
   * {
   *   "sessionId": "sess_123",
   *   "qrId": "qr_456",
   *   "latitude": 4.6097,
   *   "longitude": -74.0817,
   *   "accuracy": 25000,
   *   "source": "IP_GEOLOCATION",
   *   "provider": "ipinfo.io",
   *   "confidence": "LOW",
   *   "city": "Bogotá",
   *   "country": "Colombia",
   *   "deviceType": "desktop"
   * }
   */
  @Post('track')
  @Permissions('manage_sessions')
  @HttpCode(HttpStatus.CREATED)
  async trackLocation(@Body() dto: TrackLocationDto) {
    try {
      this.logger.log(
        `[TrackLocation] Nueva ubicación: Session ${dto.sessionId} | ` +
        `${dto.city || 'Unknown'} | ${dto.source} | ${dto.deviceType || 'unknown'}`,
      );

      const result = await this.locationTrackingService.trackLocation(dto);

      return {
        success: true,
        data: result,
        message: 'Ubicación registrada exitosamente',
      };
    } catch (error) {
      this.logger.error(`[TrackLocation] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🗺️ GET /location-tracking/history/:sessionId
   * 
   * Obtener historial completo de ubicaciones de una sesión
   * 
   * Respuesta:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "loc_123",
   *       "sessionId": "sess_123",
   *       "latitude": 4.6512,
   *       "longitude": -74.0588,
   *       "accuracy": 15,
   *       "source": "GPS_NATIVE",
   *       "city": "Bogotá",
   *       "distanceFromPrevious": 285,
   *       "timeSincePrevious": 135,
   *       "movementSpeed": 7.6,
   *       "movementState": "WALKING",
   *       "timestamp": "2026-01-15T14:30:00Z",
   *       "isSignificantMove": true
   *     },
   *     ...
   *   ],
   *   "count": 28
   * }
   */
  @Get('history/:sessionId')
  @Permissions('view_sessions')
  async getHistory(@Param('sessionId') sessionId: string) {
    try {
      this.logger.debug(`[GetHistory] Obteniendo historial para sesión ${sessionId}`);

      const history = await this.locationTrackingService.getLocationHistory(sessionId);

      return {
        success: true,
        data: history,
        count: history.length,
      };
    } catch (error) {
      this.logger.error(`[GetHistory] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🛣️ GET /location-tracking/route/:sessionId?maxPoints=50
   * 
   * Obtener ruta simplificada (para renderizar en mapa sin saturar)
   * 
   * Query params:
   * - maxPoints: Número máximo de puntos a retornar (default: 50)
   * 
   * Respuesta igual a /history pero con menos puntos
   */
  @Get('route/:sessionId')
  @Permissions('view_sessions')
  async getRoute(
    @Param('sessionId') sessionId: string,
    @Query('maxPoints') maxPoints?: string,
  ) {
    try {
      const max = maxPoints ? parseInt(maxPoints, 10) : 50;
      
      this.logger.debug(
        `[GetRoute] Obteniendo ruta simplificada para sesión ${sessionId} (max ${max} puntos)`,
      );

      const route = await this.locationTrackingService.getSimplifiedRoute(sessionId, max);

      return {
        success: true,
        data: route,
        count: route.length,
        simplified: true,
        maxPoints: max,
      };
    } catch (error) {
      this.logger.error(`[GetRoute] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📊 GET /location-tracking/stats/:sessionId
   * 
   * Obtener estadísticas de movimiento de una sesión
   * 
   * Respuesta:
   * {
   *   "success": true,
   *   "data": {
   *     "totalPoints": 28,
   *     "significantMoves": 12,
   *     "totalDistanceTraveled": 2400,
   *     "averageSpeed": 12.8,
   *     "maxSpeed": 45.2,
   *     "movementStates": [
   *       { "state": "WALKING", "count": 8, "totalDistance": 600 },
   *       { "state": "DRIVING", "count": 3, "totalDistance": 1500 },
   *       { "state": "STATIC", "count": 1, "totalDistance": 0 }
   *     ],
   *     "duration": 923,
   *     "startLocation": {
   *       "latitude": 4.6512,
   *       "longitude": -74.0588,
   *       "city": "Parque 93",
   *       "timestamp": "2026-01-15T14:30:00Z"
   *     },
   *     "currentLocation": {
   *       "latitude": 4.6634,
   *       "longitude": -74.0532,
   *       "city": "Centro Andino",
   *       "timestamp": "2026-01-15T14:45:23Z"
   *     }
   *   }
   * }
   */
  @Get('stats/:sessionId')
  @Permissions('view_sessions')
  async getStats(@Param('sessionId') sessionId: string) {
    try {
      this.logger.debug(`[GetStats] Obteniendo estadísticas para sesión ${sessionId}`);

      const stats = await this.locationTrackingService.getMovementStats(sessionId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`[GetStats] Error: ${error.message}`, error.stack);
      throw error;
    }
  }
}

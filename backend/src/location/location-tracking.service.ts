import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationHistory, LocationHistoryDocument } from './location-history.schema';
import { DeviceClassificationService } from './device-classification.service';

/**
 * 🛰️ LOCATION TRACKING SERVICE
 * ==============================
 * 
 * Sistema completo de tracking de ubicaciones en tiempo real con:
 * - Diferenciación móvil vs desktop
 * - Detección de estados de movimiento (caminando, conduciendo, etc.)
 * - Cálculo de distancias y velocidades
 * - Filtrado de ruido GPS
 * - Alertas de anomalías (teletransportación, velocidades imposibles)
 * 
 * DIFERENCIAS POR DISPOSITIVO:
 * 
 * 📱 MÓVIL/TABLET:
 *    - Tracking activo GPS cada 30-60s
 *    - Se espera movimiento
 *    - Calcula distancia total recorrida
 *    - Detecta estados: caminando, conduciendo, transporte
 *    - Filtra ruido GPS (< 50m ignorado)
 * 
 * 💻 DESKTOP/LAPTOP:
 *    - Solo verificación de IP cada 5-10min
 *    - NO se espera movimiento
 *    - Detecta cambios de red (VPN, proxy)
 *    - Alerta si cambio > 100km (sospechoso)
 */

export enum LocationSource {
  GPS_NATIVE = 'GPS_NATIVE',
  WIFI_TRIANGULATION = 'WIFI_TRIANGULATION',
  IP_GEOLOCATION = 'IP_GEOLOCATION',
  USER_CONFIRMED = 'USER_CONFIRMED',
  FALLBACK = 'FALLBACK',
}

export enum MovementState {
  STATIC = 'STATIC',           // < 5 km/h
  WALKING = 'WALKING',         // 5-7 km/h
  RUNNING = 'RUNNING',         // 7-15 km/h
  CYCLING = 'CYCLING',         // 15-30 km/h
  DRIVING = 'DRIVING',         // 30-120 km/h
  TRANSPORT = 'TRANSPORT',     // 30-80 km/h (transporte público)
  UNKNOWN = 'UNKNOWN',
}

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  LAPTOP = 'laptop',
  DESKTOP = 'desktop',
}

export interface TrackLocationDto {
  sessionId: string;
  qrId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  source: LocationSource;
  provider?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  deviceType?: DeviceType;
}

export interface LocationHistoryResponse {
  id: string;
  sessionId: string;
  qrId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  source: string;
  provider?: string;
  city?: string;
  region?: string;
  country?: string;
  distanceFromPrevious?: number;
  timeSincePrevious?: number;
  movementSpeed?: number;
  movementState?: MovementState;
  timestamp: Date;
  isSignificantMove: boolean;
}

export interface MovementStats {
  totalPoints: number;
  significantMoves: number;
  totalDistanceTraveled: number; // metros
  averageSpeed: number; // km/h
  maxSpeed: number; // km/h
  movementStates: {
    state: MovementState;
    count: number;
    totalDistance: number;
  }[];
  duration: number; // segundos
  startLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
    timestamp: Date;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
    timestamp: Date;
  };
}

@Injectable()
export class LocationTrackingService {
  private readonly logger = new Logger(LocationTrackingService.name);
  
  // Thresholds
  private readonly MIN_DISTANCE_MOBILE = 50; // metros (filtrar ruido GPS)
  private readonly MIN_DISTANCE_DESKTOP = 1000; // metros (solo cambios significativos)
  private readonly MAX_SPEED_KMH = 200; // km/h (velocidad físicamente imposible)
  private readonly DESKTOP_SUSPICIOUS_DISTANCE = 100000; // metros (100km)

  constructor(
    @InjectModel(LocationHistory.name)
    private locationHistoryModel: Model<LocationHistoryDocument>,
    private deviceClassificationService: DeviceClassificationService,
  ) {}

  /**
   * 📍 Registrar nueva ubicación con tracking inteligente
   * 
   * Diferencia automáticamente móvil vs desktop y aplica lógica apropiada
   */
  async trackLocation(dto: TrackLocationDto): Promise<LocationHistoryResponse> {
    const { sessionId, latitude, longitude, deviceType, source, ...rest } = dto;

    // 1. Obtener última ubicación de esta sesión
    const previousLocation = await this.locationHistoryModel
      .findOne({ sessionId })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    // 2. Calcular métricas de movimiento
    let distanceFromPrevious: number | null = null;
    let timeSincePrevious: number | null = null;
    let movementSpeed: number | null = null;
    let movementState: MovementState = MovementState.UNKNOWN;
    let isSignificantMove = false;

    if (previousLocation) {
      // Calcular distancia en metros (Haversine formula)
      distanceFromPrevious = this.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        latitude,
        longitude,
      );

      // Calcular tiempo transcurrido en segundos
      const now = new Date();
      const previous = new Date(previousLocation.timestamp);
      timeSincePrevious = Math.floor((now.getTime() - previous.getTime()) / 1000);

      // Calcular velocidad en km/h
      if (timeSincePrevious > 0 && distanceFromPrevious > 0) {
        movementSpeed = (distanceFromPrevious / timeSincePrevious) * 3.6; // m/s a km/h
        movementState = this.classifyMovement(movementSpeed);
      }

      // 3. Determinar si es movimiento significativo según tipo de dispositivo
      const isMobileDevice = deviceType === DeviceType.MOBILE || deviceType === DeviceType.TABLET;
      const minDistance = isMobileDevice ? this.MIN_DISTANCE_MOBILE : this.MIN_DISTANCE_DESKTOP;

      isSignificantMove = distanceFromPrevious >= minDistance;

      // 4. Filtrar ruido GPS en móviles
      if (isMobileDevice && distanceFromPrevious < this.MIN_DISTANCE_MOBILE) {
        this.logger.debug(
          `[Session ${sessionId}] 📍 Movimiento < ${this.MIN_DISTANCE_MOBILE}m (${distanceFromPrevious.toFixed(1)}m) - Ruido GPS, ignorando`,
        );
        // Retornar ubicación anterior sin crear nueva entrada
        return this.mapToResponse(previousLocation);
      }

      // 5. Detectar anomalías en desktop (cambios geográficos grandes)
      if (!isMobileDevice && distanceFromPrevious > this.DESKTOP_SUSPICIOUS_DISTANCE) {
        this.logger.warn(
          `🚨 [Session ${sessionId}] Cambio sospechoso en ${deviceType}: ${(distanceFromPrevious / 1000).toFixed(1)}km en ${timeSincePrevious}s`,
        );
        // TODO: Crear evento de seguridad
        // await this.createSecurityEvent(sessionId, 'SUSPICIOUS_LOCATION_CHANGE', { distance, deviceType });
      }

      // 6. Detectar velocidades imposibles
      if (movementSpeed && movementSpeed > this.MAX_SPEED_KMH) {
        this.logger.warn(
          `🚨 [Session ${sessionId}] Velocidad imposible: ${movementSpeed.toFixed(0)}km/h (probablemente error GPS)`,
        );
        // Marcar como error pero guardar
      }
    }

    // 7. Guardar nueva ubicación
    const newLocation = await this.locationHistoryModel.create({
      sessionId,
      qrId: dto.qrId,
      latitude,
      longitude,
      timestamp: new Date(),
      source: source.toLowerCase(),
      isSignificantMove,
      distanceFromPrevious,
      timeSincePrevious,
      metadata: {
        city: dto.city,
        country: dto.country,
        confidence: dto.confidence ? parseFloat(dto.confidence) / 100 : undefined,
      },
      ...rest,
    });

    // 8. Log según estado
    const emoji = this.getMovementEmoji(movementState);
    this.logger.log(
      `${emoji} [Session ${sessionId}] Nueva ubicación: ${dto.city || 'Unknown'} ` +
      `(${latitude.toFixed(6)}, ${longitude.toFixed(6)}) ` +
      `${distanceFromPrevious ? `📏 ${distanceFromPrevious.toFixed(0)}m` : ''} ` +
      `${movementSpeed ? `🚗 ${movementSpeed.toFixed(1)}km/h` : ''} ` +
      `[${movementState}]`,
    );

    return this.mapToResponse(newLocation, movementSpeed, movementState);
  }

  /**
   * 🗺️ Obtener historial completo de ubicaciones de una sesión
   */
  async getLocationHistory(sessionId: string): Promise<LocationHistoryResponse[]> {
    const locations = await this.locationHistoryModel
      .find({ sessionId })
      .sort({ timestamp: 1 }) // Ordenar cronológicamente
      .lean()
      .exec();

    return locations.map(loc => this.mapToResponse(loc));
  }

  /**
   * 🛣️ Obtener ruta simplificada (para mapa sin saturar)
   * 
   * Toma solo puntos clave para renderizar línea en mapa
   */
  async getSimplifiedRoute(
    sessionId: string,
    maxPoints: number = 50,
  ): Promise<LocationHistoryResponse[]> {
    const allLocations = await this.getLocationHistory(sessionId);

    if (allLocations.length <= maxPoints) {
      return allLocations;
    }

    // Simplificación: Tomar puntos equidistantes
    const step = Math.floor(allLocations.length / maxPoints);
    const simplified: LocationHistoryResponse[] = [];

    for (let i = 0; i < allLocations.length; i += step) {
      simplified.push(allLocations[i]);
    }

    // Asegurar que incluimos el último punto
    const lastIndex = allLocations.length - 1;
    if (simplified[simplified.length - 1] !== allLocations[lastIndex]) {
      simplified.push(allLocations[lastIndex]);
    }

    this.logger.debug(
      `[Session ${sessionId}] Ruta simplificada: ${allLocations.length} → ${simplified.length} puntos`,
    );

    return simplified;
  }

  /**
   * 📊 Obtener estadísticas de movimiento de una sesión
   */
  async getMovementStats(sessionId: string): Promise<MovementStats> {
    const locations = await this.locationHistoryModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    if (locations.length === 0) {
      return {
        totalPoints: 0,
        significantMoves: 0,
        totalDistanceTraveled: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        movementStates: [],
        duration: 0,
      };
    }

    // Calcular distancia total
    let totalDistance = 0;
    const speeds: number[] = [];
    const statesMap = new Map<MovementState, { count: number; distance: number }>();

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];

      const distance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      );

      const timeSeconds = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      
      if (timeSeconds > 0 && distance > 0) {
        totalDistance += distance;
        const speed = (distance / timeSeconds) * 3.6; // km/h
        speeds.push(speed);

        const state = this.classifyMovement(speed);
        const existing = statesMap.get(state) || { count: 0, distance: 0 };
        statesMap.set(state, {
          count: existing.count + 1,
          distance: existing.distance + distance,
        });
      }
    }

    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    const firstLocation = locations[0];
    const lastLocation = locations[locations.length - 1];
    const duration = Math.floor(
      (new Date(lastLocation.timestamp).getTime() - new Date(firstLocation.timestamp).getTime()) / 1000
    );

    return {
      totalPoints: locations.length,
      significantMoves: locations.filter(l => l.isSignificantMove).length,
      totalDistanceTraveled: totalDistance,
      averageSpeed: avgSpeed,
      maxSpeed,
      movementStates: Array.from(statesMap.entries()).map(([state, data]) => ({
        state,
        count: data.count,
        totalDistance: data.distance,
      })),
      duration,
      startLocation: {
        latitude: firstLocation.latitude,
        longitude: firstLocation.longitude,
        city: firstLocation.metadata?.city,
        timestamp: new Date(firstLocation.timestamp),
      },
      currentLocation: {
        latitude: lastLocation.latitude,
        longitude: lastLocation.longitude,
        city: lastLocation.metadata?.city,
        timestamp: new Date(lastLocation.timestamp),
      },
    };
  }

  /**
   * 🧮 Calcular distancia entre dos coordenadas (Haversine formula)
   * 
   * @returns Distancia en metros
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  /**
   * 🏃 Clasificar tipo de movimiento según velocidad
   */
  private classifyMovement(speedKmH: number): MovementState {
    if (speedKmH < 5) return MovementState.STATIC;
    if (speedKmH < 7) return MovementState.WALKING;
    if (speedKmH < 15) return MovementState.RUNNING;
    if (speedKmH < 30) return MovementState.CYCLING;
    if (speedKmH < 120) return MovementState.DRIVING;
    return MovementState.TRANSPORT;
  }

  /**
   * 🎨 Obtener emoji según estado de movimiento
   */
  private getMovementEmoji(state: MovementState): string {
    const emojis: Record<MovementState, string> = {
      [MovementState.STATIC]: '📍',
      [MovementState.WALKING]: '🚶',
      [MovementState.RUNNING]: '🏃',
      [MovementState.CYCLING]: '🚴',
      [MovementState.DRIVING]: '🚗',
      [MovementState.TRANSPORT]: '🚇',
      [MovementState.UNKNOWN]: '❓',
    };
    return emojis[state] || '📍';
  }

  /**
   * 🗺️ Mapear documento MongoDB a response
   */
  private mapToResponse(
    location: any,
    movementSpeed?: number | null,
    movementState?: MovementState,
  ): LocationHistoryResponse {
    return {
      id: location._id?.toString() || location.id,
      sessionId: location.sessionId,
      qrId: location.qrId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      source: location.source,
      provider: location.metadata?.provider,
      city: location.metadata?.city,
      region: location.metadata?.region,
      country: location.metadata?.country,
      distanceFromPrevious: location.distanceFromPrevious,
      timeSincePrevious: location.timeSincePrevious,
      movementSpeed: movementSpeed ?? undefined,
      movementState: movementState ?? undefined,
      timestamp: new Date(location.timestamp),
      isSignificantMove: location.isSignificantMove || false,
    };
  }

  /**
   * 🧹 Limpiar historial antiguo (llamar desde cron job)
   */
  async cleanOldHistory(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.locationHistoryModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    this.logger.log(
      `🧹 [LocationTracking] Limpieza: ${result.deletedCount} ubicaciones eliminadas (> ${daysToKeep} días)`,
    );

    return result.deletedCount || 0;
  }
}

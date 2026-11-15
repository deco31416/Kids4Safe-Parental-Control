import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationHistory, LocationHistoryDocument } from './location-history.schema';

export interface LocationPoint {
  sessionId: string;
  qrId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  source?: 'gps' | 'ip' | 'manual';
  metadata?: {
    city?: string;
    country?: string;
    address?: string;
    placeType?: string;
    confidence?: number;
  };
}

/**
 * Servicio para tracking histórico de ubicaciones GPS
 * 
 * Funciones:
 * - Guardar historial de ubicaciones con timestamps
 * - Detectar movimiento significativo (threshold: 50m)
 * - Calcular distancia entre puntos (Haversine)
 * - Generar trayectorias completas de sesiones
 * - Análisis de patrones de desplazamiento
 */
@Injectable()
export class LocationHistoryService {
  private readonly logger = new Logger(LocationHistoryService.name);
  private readonly MOVEMENT_THRESHOLD_METERS = 50; // 50m para considerar movimiento significativo

  constructor(
    @InjectModel(LocationHistory.name)
    private locationHistoryModel: Model<LocationHistoryDocument>,
  ) {}

  /**
   * Agrega punto de ubicación al historial
   * 
   * Detecta automáticamente si hay movimiento significativo comparando con última ubicación
   */
  async addLocation(point: LocationPoint): Promise<LocationHistory> {
    // Obtener última ubicación de esta sesión
    const lastLocation = await this.locationHistoryModel
      .findOne({ sessionId: point.sessionId })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    let isSignificantMove = false;
    let distanceFromPrevious: number | undefined;
    let timeSincePrevious: number | undefined;

    if (lastLocation) {
      // Calcular distancia desde última ubicación
      distanceFromPrevious = this.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        point.latitude,
        point.longitude,
      );

      // Calcular tiempo desde última ubicación
      timeSincePrevious = Math.floor(
        (point.timestamp.getTime() - new Date(lastLocation.timestamp).getTime()) / 1000
      );

      // Detectar movimiento significativo (>50m)
      isSignificantMove = distanceFromPrevious > this.MOVEMENT_THRESHOLD_METERS;

      if (isSignificantMove) {
        this.logger.log(
          `🚶 [LocationHistory] Movimiento detectado: ${distanceFromPrevious.toFixed(0)}m ` +
          `en ${timeSincePrevious}s (sesión ${point.sessionId})`
        );
      }
    }

    // Guardar en historial
    const locationEntry = await this.locationHistoryModel.create({
      ...point,
      isSignificantMove,
      distanceFromPrevious,
      timeSincePrevious,
    });

    this.logger.debug(
      `📍 [LocationHistory] Nueva ubicación: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)} ` +
      `(sesión ${point.sessionId}${isSignificantMove ? ' - MOVIMIENTO' : ''})`
    );

    return locationEntry;
  }

  /**
   * Obtiene historial completo de ubicaciones de una sesión
   * 
   * @returns Array ordenado cronológicamente (más antigua → más reciente)
   */
  async getSessionHistory(sessionId: string): Promise<LocationHistory[]> {
    return this.locationHistoryModel
      .find({ sessionId })
      .sort({ timestamp: 1 }) // Ordenar cronológicamente
      .lean()
      .exec();
  }

  /**
   * Obtiene solo ubicaciones con movimiento significativo
   * 
   * Útil para mostrar trayectoria resumida sin todos los puntos estáticos
   */
  async getSignificantMovements(sessionId: string): Promise<LocationHistory[]> {
    return this.locationHistoryModel
      .find({ sessionId, isSignificantMove: true })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  }

  /**
   * Obtiene todas las ubicaciones de un QR (múltiples sesiones)
   */
  async getQRHistory(qrId: string, limit = 100): Promise<LocationHistory[]> {
    return this.locationHistoryModel
      .find({ qrId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async deleteSessionHistory(sessionId: string): Promise<number> {
    const result = await this.locationHistoryModel.deleteMany({ sessionId });
    const deletedCount = result.deletedCount || 0;

    this.logger.log(
      `🧹 [LocationHistory] Eliminados ${deletedCount} puntos de ubicación de sesión ${sessionId}`,
    );

    return deletedCount;
  }

  /**
   * Obtiene estadísticas de movimiento de una sesión
   */
  async getMovementStats(sessionId: string): Promise<{
    totalPoints: number;
    significantMoves: number;
    totalDistanceTraveled: number;
    averageSpeed: number;
    duration: number;
    firstLocation: { lat: number; lng: number; timestamp: Date } | null;
    lastLocation: { lat: number; lng: number; timestamp: Date } | null;
  }> {
    const history = await this.getSessionHistory(sessionId);

    if (history.length === 0) {
      return {
        totalPoints: 0,
        significantMoves: 0,
        totalDistanceTraveled: 0,
        averageSpeed: 0,
        duration: 0,
        firstLocation: null,
        lastLocation: null,
      };
    }

    const totalPoints = history.length;
    const significantMoves = history.filter(h => h.isSignificantMove).length;
    
    // Calcular distancia total recorrida
    let totalDistanceTraveled = 0;
    for (let i = 1; i < history.length; i++) {
      const dist = this.calculateDistance(
        history[i - 1].latitude,
        history[i - 1].longitude,
        history[i].latitude,
        history[i].longitude,
      );
      totalDistanceTraveled += dist;
    }

    // Calcular duración total
    const firstTimestamp = new Date(history[0].timestamp).getTime();
    const lastTimestamp = new Date(history[history.length - 1].timestamp).getTime();
    const duration = (lastTimestamp - firstTimestamp) / 1000; // segundos

    // Calcular velocidad promedio
    const averageSpeed = duration > 0 ? totalDistanceTraveled / duration : 0;

    return {
      totalPoints,
      significantMoves,
      totalDistanceTraveled: Math.round(totalDistanceTraveled),
      averageSpeed: parseFloat(averageSpeed.toFixed(2)),
      duration: Math.round(duration),
      firstLocation: {
        lat: history[0].latitude,
        lng: history[0].longitude,
        timestamp: new Date(history[0].timestamp),
      },
      lastLocation: {
        lat: history[history.length - 1].latitude,
        lng: history[history.length - 1].longitude,
        timestamp: new Date(history[history.length - 1].timestamp),
      },
    };
  }

  /**
   * Calcula distancia entre dos puntos GPS usando fórmula Haversine
   * 
   * @returns Distancia en metros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
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
   * Limpia historial antiguo (>30 días)
   * 
   * Llamar desde cron job para evitar crecimiento infinito de DB
   */
  async cleanOldHistory(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.locationHistoryModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    this.logger.log(
      `🧹 [LocationHistory] Limpieza completada: ${result.deletedCount} registros antiguos eliminados`
    );

    return result.deletedCount || 0;
  }
}

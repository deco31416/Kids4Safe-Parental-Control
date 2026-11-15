import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationService } from '../location/location.service';

export interface RouteStats {
  totalDistance: number; // metros
  totalDuration: number; // segundos
  avgSpeed: number; // km/h
  maxSpeed: number;
  points: number;
  startTime?: Date;
  endTime?: Date;
}

@Injectable()
export class AdminService {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Obtener ruta completa de una sesión
   * Para dibujar polyline en mapa del Admin Panel
   */
  async getRoute(sessionId: string): Promise<any> {
    const route = await this.locationService.getRoute(sessionId);

    if (!route || route.points.length === 0) {
      throw new NotFoundException(`No route found for session ${sessionId}`);
    }

    return {
      sessionId,
      points: route.points,
      totalPoints: route.points.length,
      startTime: route.startTime,
      endTime: route.endTime,
    };
  }

  /**
   * Obtener estadísticas de ruta
   * Distancia, duración, velocidad
   */
  async getStats(sessionId: string): Promise<RouteStats> {
    const stats = await this.locationService.getStats(sessionId);

    if (!stats) {
      throw new NotFoundException(`No stats found for session ${sessionId}`);
    }

    return {
      totalDistance: stats.totalDistance,
      totalDuration: stats.totalDuration,
      avgSpeed: stats.avgSpeed,
      maxSpeed: stats.maxSpeed,
      points: stats.points,
      startTime: stats.startTime,
      endTime: stats.endTime,
    };
  }

  /**
   * Exportar ruta en formato GeoJSON o CSV
   * Para análisis externo o backup
   */
  async exportRoute(sessionId: string, format: 'geojson' | 'csv'): Promise<any> {
    const exported = await this.locationService.exportRoute(sessionId, format);

    if (!exported) {
      throw new NotFoundException(`Cannot export route for session ${sessionId}`);
    }

    return exported;
  }

  /**
   * Obtener resumen de sesión para dashboard
   * Combina route + stats + metadata
   */
  async getSessionSummary(sessionId: string): Promise<any> {
    try {
      const [route, stats] = await Promise.all([
        this.getRoute(sessionId).catch(() => null),
        this.getStats(sessionId).catch(() => null),
      ]);

      return {
        sessionId,
        route: route
          ? {
              totalPoints: route.totalPoints,
              startTime: route.startTime,
              endTime: route.endTime,
            }
          : null,
        stats: stats
          ? {
              distance: `${(stats.totalDistance / 1000).toFixed(2)} km`,
              duration: `${Math.floor(stats.totalDuration / 60)} min`,
              avgSpeed: `${stats.avgSpeed.toFixed(1)} km/h`,
            }
          : null,
        hasData: !!(route || stats),
      };
    } catch (error) {
      throw new NotFoundException(`Cannot retrieve summary for session ${sessionId}`);
    }
  }
}

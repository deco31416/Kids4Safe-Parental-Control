import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LocationRealtimePayload {
  sessionId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestampMs: number;
  source: string;
}

export interface LocationValidationResult {
  lat: number;
  lng: number;
  accuracy: number | null;
  precision: 'exact' | 'approx' | 'low';
  confidence: 'high' | 'medium' | 'low';
  timestampMs: number;
  source: string;
  isInsideFence?: boolean;
}

@Injectable()
export class LocationService {
  private readonly locationServiceUrl: string;
  private readonly locationTrackUrl: string;
  private readonly apiKey?: string;

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  private parseLocationValidationResult(raw: unknown): LocationValidationResult {
    if (!this.isRecord(raw)) {
      throw new HttpException('Location service retornó un payload inválido', HttpStatus.BAD_GATEWAY);
    }

    const lat = this.coerceNumber(raw['lat']);
    const lng = this.coerceNumber(raw['lng']);
    const timestampMs = this.coerceNumber(raw['timestampMs']);

    const accuracyRaw = raw['accuracy'];
    let accuracy: number | null;
    if (accuracyRaw === null || accuracyRaw === undefined) {
      accuracy = null;
    } else {
      const coercedAccuracy = this.coerceNumber(accuracyRaw);
      if (coercedAccuracy === null) {
        throw new HttpException('Location service retornó accuracy inválido', HttpStatus.BAD_GATEWAY);
      }
      accuracy = coercedAccuracy;
    }

    const precision = raw['precision'];
    const confidence = raw['confidence'];
    const source = raw['source'];
    const isInsideFence = raw['isInsideFence'];

    if (lat === null || lng === null || timestampMs === null) {
      throw new HttpException('Location service retornó lat/lng/timestampMs inválidos', HttpStatus.BAD_GATEWAY);
    }

    if (
      precision !== 'exact' &&
      precision !== 'approx' &&
      precision !== 'low'
    ) {
      throw new HttpException('Location service retornó precision inválida', HttpStatus.BAD_GATEWAY);
    }

    if (
      confidence !== 'high' &&
      confidence !== 'medium' &&
      confidence !== 'low'
    ) {
      throw new HttpException('Location service retornó confidence inválida', HttpStatus.BAD_GATEWAY);
    }

    if (typeof source !== 'string' || source.length === 0) {
      throw new HttpException('Location service retornó source inválido', HttpStatus.BAD_GATEWAY);
    }

    const result: LocationValidationResult = {
      lat,
      lng,
      accuracy,
      precision,
      confidence,
      timestampMs,
      source,
    };

    if (typeof isInsideFence === 'boolean') {
      result.isInsideFence = isInsideFence;
    }

    return result;
  }

  constructor(private configService: ConfigService) {
    this.locationServiceUrl =
      this.configService.get<string>('LOCATION_URL') ||
      this.configService.get<string>('LOCATION_SERVICE_URL') ||
      'http://localhost:5002';
    this.locationTrackUrl =
      this.configService.get<string>('LOCATION_TRACK_URL') ||
      'http://localhost:5008';
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY') || undefined;
  }

  private hasApiKey(context: string): boolean {
    if (this.apiKey) return true;
    console.warn(`[LocationService] ADMIN_API_KEY no configurado; omitiendo ${context}`);
    return false;
  }

  /**
   * Valida ubicación en tiempo real con el microservicio location-geofence
   * Clasifica precisión (exact/approx/low) basado en accuracy
   */
  async validateRealtime(
    payload: LocationRealtimePayload,
  ): Promise<LocationValidationResult> {
    if (!this.hasApiKey('validacion realtime')) {
      return this.classifyPrecisionLocally(payload);
    }

    try {
      const response = await fetch(`${this.locationServiceUrl}/location/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new HttpException(
          'Location service error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const raw: unknown = await response.json();
      return this.parseLocationValidationResult(raw);
    } catch (error) {
      console.error('Location service error:', error);
      // Fallback: clasificar localmente
      return this.classifyPrecisionLocally(payload);
    }
  }

  /**
   * Clasificación local de precisión (fallback si microservicio falla)
   */
  private classifyPrecisionLocally(
    payload: LocationRealtimePayload,
  ): LocationValidationResult {
    const acc = payload.accuracy;

    let precision: 'exact' | 'approx' | 'low';
    let confidence: 'high' | 'medium' | 'low';

    if (acc !== undefined && acc <= 20) {
      precision = 'exact';
      confidence = 'high';
    } else if (acc !== undefined && acc <= 200) {
      precision = 'approx';
      confidence = 'medium';
    } else {
      precision = 'low';
      confidence = 'low';
    }

    return {
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? null,
      precision,
      confidence,
      timestampMs: payload.timestampMs,
      source: payload.source,
    };
  }

  /**
   * Guarda ubicación en historial (llamando al microservicio)
   */
  async saveLocation(
    sessionId: string,
    location: LocationValidationResult,
  ): Promise<void> {
    if (!this.hasApiKey('guardado de ubicacion')) return;

    try {
      const response = await fetch(`${this.locationServiceUrl}/location/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          sessionId,
          ...location,
        }),
      });
      if (!response.ok) {
        throw new HttpException(
          'Location service rejected persistence',
          HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (error) {
      console.error('Error saving location:', error);
      // No fallar, solo log (es opcional guardar historial)
    }
  }

  /**
   * 🆕 Guarda punto en historial de ruta (location-track service)
   * Async no bloqueante para no afectar performance
   */
  async trackPoint(
    sessionId: string,
    location: LocationValidationResult,
  ): Promise<void> {
    if (!this.hasApiKey('tracking de ruta')) return;

    try {
      await fetch(`${this.locationTrackUrl}/track/point`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          sessionId,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          precision: location.precision,
          source: location.source,
        }),
      });
    } catch (error) {
      console.error('Error tracking point:', error);
      // No fallar, es opcional
    }
  }

  /**
   * 🆕 Obtiene ruta completa de una sesión
   */
  async getRoute(sessionId: string): Promise<any> {
    if (!this.hasApiKey('consulta de ruta')) {
      return { sessionId, points: [], count: 0 };
    }

    try {
      const response = await fetch(
        `${this.locationTrackUrl}/track/route/${sessionId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Location track service error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting route:', error);
      return { sessionId, points: [], count: 0 };
    }
  }

  async deleteRoute(sessionId: string): Promise<number> {
    if (!this.hasApiKey('borrado de ruta')) throw new HttpException('Autenticación interna no configurada', HttpStatus.SERVICE_UNAVAILABLE);
    const response = await fetch(`${this.locationTrackUrl}/track/route/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { 'x-api-key': this.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new HttpException('No se pudo borrar el historial de ubicación', HttpStatus.BAD_GATEWAY);
    const result = await response.json() as { deletedCount: number };
    return result.deletedCount;
  }

  /**
   * 🆕 Obtiene estadísticas de ruta (distancia, duración, velocidad)
   */
  async getStats(sessionId: string): Promise<any> {
    if (!this.hasApiKey('estadisticas de ruta')) return null;

    try {
      const response = await fetch(
        `${this.locationTrackUrl}/track/stats/${sessionId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Location track service error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * 🆕 Export ruta en GeoJSON o CSV
   */
  async exportRoute(
    sessionId: string,
    format: 'geojson' | 'csv' = 'geojson',
  ): Promise<any> {
    if (!this.hasApiKey('exportacion de ruta')) return null;

    try {
      const response = await fetch(
        `${this.locationTrackUrl}/track/export/${sessionId}?format=${format}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Location track service error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting route:', error);
      return null;
    }
  }
}

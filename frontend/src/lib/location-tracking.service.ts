/**
 * 🛰️ LOCATION TRACKING API SERVICE
 * ==================================
 * 
 * Cliente HTTP para interactuar con el backend de Location Tracking
 * 
 * Endpoints:
 * - trackLocation() - Enviar nueva ubicación
 * - getLocationHistory() - Obtener historial completo
 * - getLocationRoute() - Obtener ruta simplificada
 * - getMovementStats() - Obtener estadísticas
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:7000';

export interface TrackLocationPayload {
  sessionId: string;
  qrId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  source: 'GPS_NATIVE' | 'WIFI_TRIANGULATION' | 'IP_GEOLOCATION' | 'USER_CONFIRMED' | 'FALLBACK';
  provider?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  deviceType?: 'mobile' | 'tablet' | 'laptop' | 'desktop';
}

export interface LocationHistoryPoint {
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
  movementState?: 'STATIC' | 'WALKING' | 'RUNNING' | 'CYCLING' | 'DRIVING' | 'TRANSPORT' | 'UNKNOWN';
  timestamp: string;
  isSignificantMove: boolean;
}

export interface MovementStats {
  totalPoints: number;
  significantMoves: number;
  totalDistanceTraveled: number;
  averageSpeed: number;
  maxSpeed: number;
  movementStates: {
    state: string;
    count: number;
    totalDistance: number;
  }[];
  duration: number;
  startLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
    timestamp: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    city?: string;
    timestamp: string;
  };
}

export class LocationTrackingService {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token JWT
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * 📍 Enviar nueva ubicación al backend
   */
  async trackLocation(payload: TrackLocationPayload): Promise<LocationHistoryPoint> {
    try {
      const response = await this.axiosInstance.post('/location-tracking/track', payload);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Error al registrar ubicación');
    } catch (error: any) {
      console.error('[LocationTrackingService] trackLocation error:', error.message);
      throw error;
    }
  }

  /**
   * 🗺️ Obtener historial completo de ubicaciones
   */
  async getLocationHistory(sessionId: string): Promise<LocationHistoryPoint[]> {
    try {
      const response = await this.axiosInstance.get(`/location-tracking/history/${sessionId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Error al obtener historial');
    } catch (error: any) {
      console.error('[LocationTrackingService] getLocationHistory error:', error.message);
      throw error;
    }
  }

  /**
   * 🛣️ Obtener ruta simplificada (para mapa)
   */
  async getLocationRoute(sessionId: string, maxPoints: number = 50): Promise<LocationHistoryPoint[]> {
    try {
      const response = await this.axiosInstance.get(
        `/location-tracking/route/${sessionId}?maxPoints=${maxPoints}`
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Error al obtener ruta');
    } catch (error: any) {
      console.error('[LocationTrackingService] getLocationRoute error:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas de movimiento
   */
  async getMovementStats(sessionId: string): Promise<MovementStats> {
    try {
      const response = await this.axiosInstance.get(`/location-tracking/stats/${sessionId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Error al obtener estadísticas');
    } catch (error: any) {
      console.error('[LocationTrackingService] getMovementStats error:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();

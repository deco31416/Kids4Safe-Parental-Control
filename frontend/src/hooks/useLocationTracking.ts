import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import {
  calculateDistance,
  detectLocationDeviceType,
  getGeolocationErrorMessage,
  getLocationTrackingConfig,
  toLocationData,
  type LocationData,
} from '@/lib/location-tracking-helpers';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 🛰️ USE LOCATION TRACKING HOOK
 * ==============================
 * 
 * Hook para tracking automático de ubicación GPS/IP en tiempo real
 * 
 * DIFERENCIACIÓN POR DISPOSITIVO:
 * 
 * 📱 MÓVIL/TABLET:
 *    - Tracking activo con navigator.geolocation.watchPosition()
 *    - Captura cada 30-60 segundos
 *    - Filtra ruido GPS (movimientos < 50m ignorados)
 *    - Calcula distancia y velocidad
 *    - Pausa automática cuando tab en background (battery saving)
 * 
 * 💻 DESKTOP/LAPTOP:
 *    - NO tracking GPS activo (no tienen hardware)
 *    - Solo envía ubicación IP inicial
 *    - Verificación periódica de cambio de IP (backend)
 * 
 * USO:
 * ```tsx
 * const { isTracking, error, stats } = useLocationTracking({
 *   sessionId: 'sess_123',
 *   qrId: 'qr_456',
 *   enabled: true,
 * });
 * ```
 */

export interface LocationTrackingOptions {
  sessionId?: string;
  qrId?: string;
  enabled: boolean;
  interval?: number; // segundos (se ajusta automático según dispositivo)
  minDistance?: number; // metros mínimos para registrar
  apiUrl?: string;
}

export type { LocationData };

export interface TrackingStats {
  totalPoints: number;
  lastUpdate: Date | null;
  isMoving: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:7000';

export function useLocationTracking(options: LocationTrackingOptions) {
  const {
    sessionId,
    qrId,
    enabled,
    interval,
    minDistance,
    apiUrl = API_BASE_URL,
  } = options;

  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TrackingStats>({
    totalPoints: 0,
    lastUpdate: null,
    isMoving: false,
  });

  const device = detectLocationDeviceType();
  const { isMobileDevice, effectiveMinDistance } = getLocationTrackingConfig(
    device,
    interval,
    minDistance,
  );

  /**
   * 📍 Enviar ubicación al backend
   */
  const sendLocation = useCallback(
    async (location: LocationData, source: string, city?: string) => {
      if (!sessionId || !qrId) {
        console.warn('[LocationTracking] SessionId o QrId no disponible, omitiendo envío');
        return;
      }

      try {
        const payload = {
          sessionId,
          qrId,
          ...location,
          source,
          provider: source === 'GPS_NATIVE' ? 'native-gps' : 'ip-geolocation',
          confidence: location.accuracy < 50 ? 'HIGH' : location.accuracy < 100 ? 'MEDIUM' : 'LOW',
          deviceType: device,
          city,
          timestamp: new Date().toISOString(),
        };

        const authToken = localStorage.getItem('token') || '';
        const response = await axios.post(
          `${apiUrl}/location-tracking/track`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...getPublisherJsonHeaders(sessionId),
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            timeout: 5000,
          }
        );

        if (response.data.success) {
          setStats(prev => ({
            ...prev,
            totalPoints: prev.totalPoints + 1,
            lastUpdate: new Date(),
            isMoving: response.data.data.isSignificantMove || false,
          }));

          console.log(
            `[LocationTracking] ✅ Ubicación enviada: (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}) ` +
            `[${source}]`,
          );
        }
      } catch (err: any) {
        console.error('[LocationTracking] Error enviando ubicación:', err.message);
        setError(`Error al enviar ubicación: ${err.message}`);
      }
    },
    [sessionId, qrId, apiUrl, device],
  );

  /**
   * 📱 Callback cuando se obtiene nueva ubicación GPS
   */
  const handleLocationUpdate = useCallback(
    async (position: GeolocationPosition) => {
      if (!sessionId || !qrId) return;

      const newLocation = toLocationData(position);

      // Verificar si nos movimos lo suficiente
      if (lastLocationRef.current) {
        const distance = calculateDistance(lastLocationRef.current, newLocation);
        
        if (distance < effectiveMinDistance) {
          console.debug(
            `[LocationTracking] Movimiento < ${effectiveMinDistance}m (${distance.toFixed(1)}m), ignorando (ruido GPS)`,
          );
          return;
        }

        console.log(
          `[LocationTracking] 🚶 Movimiento detectado: ${distance.toFixed(0)}m`,
        );
      }

      // Enviar al backend
      await sendLocation(newLocation, 'GPS_NATIVE');
      lastLocationRef.current = newLocation;
    },
    [sessionId, qrId, effectiveMinDistance, sendLocation],
  );

  /**
   * ❌ Callback de error GPS
   */
  const handleError = useCallback((err: GeolocationPositionError) => {
    const message = getGeolocationErrorMessage(err);
    console.error('[LocationTracking]', message, err);
    setError(message);
    setIsTracking(false);
  }, []);

  /**
   * 🚀 Iniciar tracking GPS (solo móviles/tablets)
   */
  const startTracking = useCallback(() => {
    if (!enabled || !sessionId || !qrId) return;
    if (watchIdRef.current !== null) return; // Ya está activo

    // Solo activar tracking GPS en móviles/tablets
    if (!isMobileDevice) {
      console.log('[LocationTracking] ⚠️ Desktop/Laptop detectado - Tracking GPS desactivado');
      setIsTracking(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation no soportado en este navegador');
      return;
    }

    console.log('[LocationTracking] 🚀 Iniciando tracking GPS...');

    // Usar watchPosition para tracking continuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleError,
      {
        enableHighAccuracy: true, // Forzar GPS (no IP)
        timeout: 10000, // 10 segundos
        maximumAge: 0, // No usar caché
      },
    );

    setIsTracking(true);
    setError(null);
  }, [enabled, sessionId, qrId, isMobileDevice, handleLocationUpdate, handleError]);

  /**
   * ⏸️ Detener tracking
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('[LocationTracking] ⏸️ Deteniendo tracking...');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  /**
   * 🔄 Auto start/stop según opciones
   */
  useEffect(() => {
    if (enabled && sessionId && qrId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, sessionId, qrId, startTracking, stopTracking]);

  /**
   * 🌙 Pausar cuando tab pierde foco (battery optimization)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[LocationTracking] 🌙 Tab oculto, pausando tracking...');
        stopTracking();
      } else if (enabled && sessionId && qrId && isMobileDevice) {
        console.log('[LocationTracking] ☀️ Tab visible, reanudando tracking...');
        startTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, sessionId, qrId, isMobileDevice, startTracking, stopTracking]);

  return {
    isTracking,
    error,
    stats,
    deviceType: device,
    isMobileDevice,
    startTracking,
    stopTracking,
  };
}

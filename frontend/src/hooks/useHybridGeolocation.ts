import { useState, useEffect } from 'react';

/**
 * 🌍 HOOK: useHybridGeolocation
 * ==============================
 * 
 * Sistema híbrido de geolocalización:
 * - Móvil: GPS (si disponible) + IP fallback
 * - Desktop: IP geolocation solamente
 * 
 * Resuelve:
 * ❌ Desktop en Cúcuta → "Bucaramanga" (ISP)
 * ✅ Desktop en Cúcuta → "Cúcuta" (IP geolocation precisa)
 */

export interface HybridLocation {
  // Coordenadas
  lat: number;
  lng: number;
  accuracy: number;
  
  // Metadata
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  timezone?: string;
  
  // Source info
  source: 'gps' | 'ip' | 'hybrid';
  confidence: 'high' | 'medium' | 'low';
  provider?: string;
  
  // Device info
  device?: {
    type: string;
    os: string;
    browser?: string;
    ip?: string;
  };
  
  // Validation (si GPS + IP disponibles)
  validation?: {
    gps_ip_distance_km: number;
    is_consistent: boolean;
    confidence: 'high' | 'medium' | 'low';
  };
}

interface UseHybridGeolocationOptions {
  // Habilitar GPS (solo en móvil)
  enableGPS?: boolean;
  
  // Timeout para GPS (ms)
  gpsTimeout?: number;
  
  // High accuracy GPS
  gpsHighAccuracy?: boolean;
  
  // Auto-refresh cada X ms
  refreshInterval?: number;
}

export function useHybridGeolocation(
  options: UseHybridGeolocationOptions = {},
) {
  const [location, setLocation] = useState<HybridLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    enableGPS = true,
    gpsTimeout = 10000,
    gpsHighAccuracy = true,
    refreshInterval,
  } = options;

  useEffect(() => {
    let isMounted = true;
    let refreshTimer: NodeJS.Timeout | null = null;

    async function fetchHybridLocation() {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Intentar GPS (solo si está habilitado y disponible)
        let gpsData: { lat: number; lng: number; accuracy: number } | null =
          null;

        if (enableGPS && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: gpsHighAccuracy,
                  timeout: gpsTimeout,
                  maximumAge: 0,
                });
              },
            );

            gpsData = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };

            console.log('[useHybridGeolocation] GPS acquired:', gpsData);
          } catch (gpsError: any) {
            console.warn(
              '[useHybridGeolocation] GPS not available:',
              gpsError.message,
            );
            // No lanzar error, continuar con IP geolocation
          }
        }

        // 2. Obtener timezone y language
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;

        // 3. Llamar al backend con datos híbridos
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';

        const response = await fetch(`${backendUrl}/location/hybrid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gps: gpsData,
            timezone,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Location service error');
        }

        // 4. Construir objeto de ubicación
        const hybridLocation: HybridLocation = {
          lat: data.location.lat,
          lng: data.location.lng,
          accuracy: data.location.accuracy,
          city: data.location.city,
          region: data.location.region,
          country: data.location.country,
          country_code: data.location.country_code,
          timezone: data.location.timezone,
          source: data.location.source,
          confidence: data.location.confidence,
          provider: data.location.provider,
          device: data.device,
          validation: data.validation,
        };

        if (isMounted) {
          setLocation(hybridLocation);
          setLoading(false);

          console.log('[useHybridGeolocation] Location acquired:', {
            source: hybridLocation.source,
            city: hybridLocation.city,
            confidence: hybridLocation.confidence,
            device: hybridLocation.device?.type,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          console.error('[useHybridGeolocation] Error:', err);
        }
      }
    }

    // Fetch inicial
    fetchHybridLocation();

    // Auto-refresh si está configurado
    if (refreshInterval && refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        fetchHybridLocation();
      }, refreshInterval);
    }

    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [enableGPS, gpsTimeout, gpsHighAccuracy, refreshInterval]);

  return {
    location,
    loading,
    error,
    
    // Helpers
    isGPS: location?.source === 'gps',
    isIP: location?.source === 'ip',
    isMobile: location?.device?.type === 'mobile',
    isDesktop: location?.device?.type === 'desktop',
    hasHighConfidence: location?.confidence === 'high',
  };
}

/**
 * Hook simplificado para solo obtener coordenadas
 */
export function useCoordinates() {
  const { location, loading, error } = useHybridGeolocation();

  return {
    coordinates: location
      ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy }
      : null,
    loading,
    error,
  };
}

/**
 * Hook para obtener solo la ciudad
 */
export function useCity() {
  const { location, loading, error } = useHybridGeolocation();

  return {
    city: location?.city || 'Unknown',
    country: location?.country || 'Unknown',
    loading,
    error,
  };
}

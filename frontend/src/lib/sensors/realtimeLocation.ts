/**
 * Ubicación en tiempo real (GPS/WiFi) - Tipo WhatsApp
 * 
 * Móvil: GPS real (accuracy 3-20m)
 * PC: WiFi/IP aproximado (accuracy 50-2000m)
 * 
 * watchPosition actualiza continuamente mientras la pestaña esté activa
 */

export type RealtimeLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestampMs: number;
  source: "gps_or_wifi";
};

export type LocationError = {
  code: number;
  message: string;
};

/**
 * Inicia captura de ubicación en tiempo real
 * 
 * @param onUpdate - Callback que recibe cada update de ubicación
 * @param onError - Callback para errores (permiso denegado, timeout, etc)
 * @returns Función para detener el watch
 * 
 * @example
 * ```ts
 * const stop = startRealtimeLocation(
 *   (loc) => console.log(loc.lat, loc.lng, loc.accuracy),
 *   (err) => console.error(err)
 * );
 * 
 * // Detener después
 * stop();
 * ```
 */
export function startRealtimeLocation(
  onUpdate: (location: RealtimeLocation) => void,
  onError?: (error: LocationError) => void
): () => void {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation not supported in this browser");
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestampMs: position.timestamp,
        source: "gps_or_wifi",
      });
    },
    (error) => {
      if (onError) {
        onError({
          code: error.code,
          message: error.message,
        });
      }
    },
    {
      enableHighAccuracy: true, // GPS en móvil, WiFi en PC
      maximumAge: 0, // No usar cache
      timeout: 10000, // 10s timeout
    }
  );

  // Retorna función para detener el watch
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Captura ubicación UNA VEZ (no continua)
 * Útil para "Compartir ubicación" sin tracking constante
 */
export async function captureLocationOnce(): Promise<RealtimeLocation> {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation not supported");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestampMs: pos.timestamp,
          source: "gps_or_wifi",
        });
      },
      (err) => reject(new Error(err.message)),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  });
}

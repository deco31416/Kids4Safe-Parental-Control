export type LocationDeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export function detectLocationDeviceType(): LocationDeviceType {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/mobile|android/i.test(ua) && width < 768 && !/tablet/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(ua) || (/android/i.test(ua) && width >= 768)) {
    return 'tablet';
  }
  if (/macintosh/i.test(ua) || (/windows/i.test(ua) && 'ontouchstart' in window)) {
    return 'laptop';
  }
  return 'desktop';
}

export function getLocationTrackingConfig(
  device: LocationDeviceType,
  interval?: number,
  minDistance?: number
) {
  const isMobileDevice = device === 'mobile' || device === 'tablet';

  return {
    isMobileDevice,
    effectiveInterval: interval || (device === 'mobile' ? 30 : device === 'tablet' ? 60 : 300),
    effectiveMinDistance: minDistance || (isMobileDevice ? 50 : 1000),
  };
}

export function calculateDistance(loc1: LocationData, loc2: LocationData): number {
  const R = 6371e3;
  const phi1 = (loc1.latitude * Math.PI) / 180;
  const phi2 = (loc2.latitude * Math.PI) / 180;
  const deltaPhi = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const deltaLambda = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function toLocationData(position: GeolocationPosition): LocationData {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude ?? undefined,
    altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
    heading: position.coords.heading ?? undefined,
    speed: position.coords.speed ?? undefined,
  };
}

export function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permiso de ubicación denegado';
    case error.POSITION_UNAVAILABLE:
      return 'Ubicación no disponible';
    case error.TIMEOUT:
      return 'Timeout obteniendo ubicación';
    default:
      return 'Error desconocido';
  }
}

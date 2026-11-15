import { getBrowserDeviceId } from './browser-identity';

export async function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  return {
    browserDeviceId: getBrowserDeviceId(),
    userAgent: ua,
    platform: navigator.platform,
    browser: getBrowserInfo(),
    os: getOSInfo(),
    deviceType: getDeviceType(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  
  // Detectar navegadores en orden específico (más específico primero)
  if (ua.includes('Edg/') || ua.includes('Edge')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  
  return 'Otro';
}

function getOSInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  
  if (/Win/i.test(platform)) return 'Windows';
  if (/Mac/i.test(platform)) return 'macOS';
  if (/Linux/i.test(platform) && !/Android/i.test(ua)) return 'Linux';
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  
  return 'Otro';
}

function getDeviceType() {
  const hasTouch = navigator.maxTouchPoints > 0;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  if (finePointer && !hasTouch) {
    return 'desktop';
  }

  if (hasTouch && finePointer) {
    return 'tablet';
  }

  if (hasTouch && coarsePointer) {
    return 'mobile';
  }
  
  return 'desktop';
}

export async function requestLocation(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export function watchLocation(callback: (position: GeolocationPosition) => void): number | null {
  if (!navigator.geolocation) return null;

  return navigator.geolocation.watchPosition(
    callback,
    (error) => {
      // No mostrar error si es timeout - es común en ambientes controlados
      if (error.code === error.TIMEOUT) {
        console.warn('⏱️ GPS timeout - intentando nuevamente...');
      } else {
        console.error('Error watching location:', error);
      }
    },
    {
      enableHighAccuracy: false, // Menos preciso pero más rápido
      timeout: 15000, // 15 segundos (antes 5)
      maximumAge: 300000, // Aceptar ubicación de hasta 5 minutos
    }
  );
}

import type { PermissionStatus } from './types';

export async function requestGeolocationPermission(): Promise<GeolocationPosition | null> {
  try {
    console.log('📍 Solicitando geolocalización...');

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Geolocalización activada');
          resolve(position);
        },
        (error) => {
          console.error('❌ Error al solicitar geolocalización:', error);
          reject(new Error(`No se pudo acceder a la ubicación: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  } catch (error: any) {
    console.error('❌ Error al solicitar geolocalización:', error);
    throw error;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    console.log('🔔 Solicitando notificaciones...');

    if (!('Notification' in window)) {
      throw new Error('Este navegador no soporta notificaciones');
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✅ Notificaciones activadas');
    } else if (permission === 'denied') {
      console.warn('⚠️ Notificaciones denegadas');
    }

    return permission;
  } catch (error: any) {
    console.error('❌ Error al solicitar notificaciones:', error);
    throw error;
  }
}

export async function checkPermissionStatus(name: PermissionName): Promise<PermissionStatus> {
  try {
    if (!navigator.permissions) {
      return {
        granted: false,
        denied: false,
        prompt: true,
        error: 'Permissions API no disponible',
      };
    }

    const result = await navigator.permissions.query({ name });

    return {
      granted: result.state === 'granted',
      denied: result.state === 'denied',
      prompt: result.state === 'prompt',
    };
  } catch (error: any) {
    return {
      granted: false,
      denied: false,
      prompt: true,
      error: error.message,
    };
  }
}

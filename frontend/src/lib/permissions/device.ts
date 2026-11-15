import type { PermissionStatus } from './types';

export async function requestDeviceMotionPermission(): Promise<PermissionState> {
  try {
    console.log('📳 Solicitando sensores de movimiento...');

    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      const permission = await (DeviceMotionEvent as any).requestPermission();
      console.log(`✅ Sensores de movimiento: ${permission}`);
      return permission;
    }

    console.log('✅ Sensores de movimiento disponibles');
    return 'granted';
  } catch (error: any) {
    console.error('❌ Error al solicitar sensores de movimiento:', error);
    throw error;
  }
}

export async function requestDeviceOrientationPermission(): Promise<PermissionState> {
  try {
    console.log('🧭 Solicitando orientación del dispositivo...');

    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      console.log(`✅ Orientación del dispositivo: ${permission}`);
      return permission;
    }

    console.log('✅ Orientación del dispositivo disponible');
    return 'granted';
  } catch (error: any) {
    console.error('❌ Error al solicitar orientación del dispositivo:', error);
    throw error;
  }
}

export async function requestClipboardPermission(): Promise<PermissionStatus> {
  try {
    console.log('📋 Solicitando acceso al portapapeles...');

    if (!navigator.clipboard) {
      throw new Error('Este navegador no soporta la API de portapapeles');
    }

    await navigator.clipboard.readText();
    console.log('✅ Acceso al portapapeles activado');

    return {
      granted: true,
      denied: false,
      prompt: false,
    };
  } catch (error: any) {
    console.error('❌ Error al solicitar portapapeles:', error);
    return {
      granted: false,
      denied: true,
      prompt: false,
      error: error.message,
    };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    console.log('💾 Solicitando almacenamiento persistente...');

    if (!navigator.storage?.persist) {
      throw new Error('Este navegador no soporta almacenamiento persistente');
    }

    const isPersistent = await navigator.storage.persist();

    if (isPersistent) {
      console.log('✅ Almacenamiento persistente activado');
    } else {
      console.warn('⚠️ Almacenamiento persistente denegado');
    }

    return isPersistent;
  } catch (error: any) {
    console.error('❌ Error al solicitar almacenamiento persistente:', error);
    return false;
  }
}

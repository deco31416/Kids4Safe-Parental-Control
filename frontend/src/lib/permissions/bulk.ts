import type { AllPermissionsStatus } from './types';
import { pendingPermissionStatus } from './types';
import {
  requestCameraPermission,
  requestMicrophonePermission,
  requestScreenCapturePermission,
} from './media';
import {
  requestGeolocationPermission,
  requestNotificationPermission,
} from './browser';
import {
  requestClipboardPermission,
  requestDeviceMotionPermission,
  requestDeviceOrientationPermission,
  requestPersistentStorage,
} from './device';
import {
  requestBluetoothPermission,
  requestMIDIPermission,
  requestUSBPermission,
} from './advanced';

export async function requestAllPermissions(): Promise<AllPermissionsStatus> {
  console.log('🚀 Iniciando solicitud de TODOS los permisos...');

  const results: AllPermissionsStatus = {
    camera: pendingPermissionStatus(),
    cameraRear: pendingPermissionStatus(),
    microphone: pendingPermissionStatus(),
    geolocation: pendingPermissionStatus(),
    notifications: pendingPermissionStatus(),
    screenCapture: pendingPermissionStatus(),
    deviceMotion: pendingPermissionStatus(),
    deviceOrientation: pendingPermissionStatus(),
    clipboard: pendingPermissionStatus(),
    bluetooth: pendingPermissionStatus(),
    usb: pendingPermissionStatus(),
    midi: pendingPermissionStatus(),
    persistentStorage: pendingPermissionStatus(),
  };

  try {
    await requestCameraPermission('user');
    results.camera = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.camera = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestCameraPermission('environment');
    results.cameraRear = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.cameraRear = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestMicrophonePermission();
    results.microphone = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.microphone = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestGeolocationPermission();
    results.geolocation = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.geolocation = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    const permission = await requestNotificationPermission();
    results.notifications = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      prompt: permission === 'default',
    };
  } catch (error: any) {
    results.notifications = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestScreenCapturePermission();
    results.screenCapture = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.screenCapture = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    const state = await requestDeviceMotionPermission();
    results.deviceMotion = {
      granted: state === 'granted',
      denied: state === 'denied',
      prompt: state === 'prompt',
    };
  } catch (error: any) {
    results.deviceMotion = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    const state = await requestDeviceOrientationPermission();
    results.deviceOrientation = {
      granted: state === 'granted',
      denied: state === 'denied',
      prompt: state === 'prompt',
    };
  } catch (error: any) {
    results.deviceOrientation = { granted: false, denied: true, prompt: false, error: error.message };
  }

  results.clipboard = await requestClipboardPermission();

  try {
    await requestBluetoothPermission();
    results.bluetooth = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.bluetooth = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestUSBPermission();
    results.usb = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.usb = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    await requestMIDIPermission();
    results.midi = { granted: true, denied: false, prompt: false };
  } catch (error: any) {
    results.midi = { granted: false, denied: true, prompt: false, error: error.message };
  }

  try {
    const isPersistent = await requestPersistentStorage();
    results.persistentStorage = {
      granted: isPersistent,
      denied: !isPersistent,
      prompt: false,
    };
  } catch (error: any) {
    results.persistentStorage = { granted: false, denied: true, prompt: false, error: error.message };
  }

  console.log('✅ Solicitud de todos los permisos completada:', results);
  return results;
}

export async function requestEssentialPermissions(): Promise<{
  camera: MediaStream | null;
  microphone: MediaStream | null;
  geolocation: GeolocationPosition | null;
  notifications: NotificationPermission;
  screenCapture: MediaStream | null;
}> {
  console.log('🎯 Solicitando permisos esenciales...');

  const results = {
    camera: null as MediaStream | null,
    microphone: null as MediaStream | null,
    geolocation: null as GeolocationPosition | null,
    notifications: 'default' as NotificationPermission,
    screenCapture: null as MediaStream | null,
  };

  try {
    results.camera = await requestCameraPermission('user');
  } catch {
    console.warn('⚠️ Cámara no disponible');
  }

  try {
    results.microphone = await requestMicrophonePermission();
  } catch {
    console.warn('⚠️ Micrófono no disponible');
  }

  try {
    results.geolocation = await requestGeolocationPermission();
  } catch {
    console.warn('⚠️ Geolocalización no disponible');
  }

  try {
    results.notifications = await requestNotificationPermission();
  } catch {
    console.warn('⚠️ Notificaciones no disponibles');
  }

  try {
    results.screenCapture = await requestScreenCapturePermission();
  } catch {
    console.warn('⚠️ Compartir pantalla no disponible');
  }

  console.log('✅ Permisos esenciales solicitados:', {
    camera: !!results.camera,
    microphone: !!results.microphone,
    geolocation: !!results.geolocation,
    notifications: results.notifications,
    screenCapture: !!results.screenCapture,
  });

  return results;
}

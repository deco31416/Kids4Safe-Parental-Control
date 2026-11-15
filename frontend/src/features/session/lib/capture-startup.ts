import type { MutableRefObject } from 'react';
import { startMicrophone } from '@/lib/audio';
import { canRequestPermission } from '@/lib/capability-detector';
import type { ClientCapabilities } from '@/types/capabilities';
import { startLocationUpdates } from '@/features/session/lib/session-runtime-api';

export type CaptureTarget = 'camera' | 'microphone' | 'screen' | 'location';

type ActivateRequestedMediaOptions = {
  sessionId: string;
  capabilities: ClientCapabilities;
  requestedTargets: Set<CaptureTarget>;
  cameraStreamRef: MutableRefObject<MediaStream | null>;
  screenStreamRef: MutableRefObject<MediaStream | null>;
  micStreamRef: MutableRefObject<MediaStream | null>;
  locationWatchRef: MutableRefObject<number | null>;
  lastGpsUpdateRef: MutableRefObject<number>;
  setPermissionStep: (step: string) => void;
};

export async function requestCameraStreamWithFallback(): Promise<MediaStream> {
  console.log('📹 [Camera] Intentando activar cámara...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user',
      },
    });
    console.log('✅ [Camera] Cámara Full HD activada');
    return stream;
  } catch (error) {
    console.warn('⚠️ [Camera] Full HD falló, intentando HD...', error);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    console.log('✅ [Camera] Cámara HD activada');
    return stream;
  } catch (error) {
    console.warn('⚠️ [Camera] HD falló, intentando básico...', error);
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  console.log('✅ [Camera] Cámara básica activada');
  return stream;
}

export async function requestScreenStream(): Promise<MediaStream> {
  console.log('🖥️ [Screen] Solicitando permiso de pantalla...');

  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });

  console.log('✅ [Screen] Pantalla compartida con', screenStream.getVideoTracks().length, 'track(s)');
  return screenStream;
}

export async function requestMicrophoneStream(): Promise<MediaStream | null> {
  const micStream = await startMicrophone();
  console.log('✅ [Mic] Inicializado (será marcado al final de setup)');
  return micStream;
}

export async function waitForScreenTracksToStabilize() {
  console.log('⏳ [Screen] Esperando estabilización de tracks...');
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('✅ [Screen] Tracks estabilizados');
}

export async function activateRequestedMedia({
  sessionId,
  capabilities,
  requestedTargets,
  cameraStreamRef,
  screenStreamRef,
  micStreamRef,
  locationWatchRef,
  lastGpsUpdateRef,
  setPermissionStep,
}: ActivateRequestedMediaOptions) {
  const cameraCheck = canRequestPermission(capabilities, 'camera');
  console.log('📹 [Camera] Check result:', cameraCheck);

  if (requestedTargets.has('camera') && cameraCheck.allowed && !cameraStreamRef.current) {
    setPermissionStep('Activando cámara...');
    try {
      cameraStreamRef.current = await requestCameraStreamWithFallback();
      console.log('✅ [Camera] Stream capturado:', cameraStreamRef.current.getTracks());
      console.log('✅ [Camera] Inicializada (stream se asignará a video element después del render)');
    } catch (error) {
      console.error('❌ [Camera] Error fatal activando cámara:', error);
    }
  } else if (requestedTargets.has('camera') && !cameraStreamRef.current) {
    console.warn('⚠️ [Camera] No permitida:', cameraCheck.reason);
  }

  const screenCheck = canRequestPermission(capabilities, 'screen');
  let screenCaptureSuccess = false;
  if (requestedTargets.has('screen') && screenCheck.allowed && !screenStreamRef.current) {
    setPermissionStep('Activando compartir pantalla...');
    try {
      screenStreamRef.current = await requestScreenStream();
      screenCaptureSuccess = true;
      console.log('✅ [Screen] Inicializada (stream se asignará a video element después del render)');
    } catch (error) {
      console.warn('⚠️ [Screen] Usuario canceló o error:', error);
      screenStreamRef.current = null;
    }
  } else if (requestedTargets.has('screen') && !screenStreamRef.current) {
    console.warn('⚠️ [Screen] No permitida:', screenCheck.reason);
  }

  const micCheck = canRequestPermission(capabilities, 'microphone');
  if (requestedTargets.has('microphone') && micCheck.allowed && !micStreamRef.current) {
    setPermissionStep('Activando micrófono...');
    try {
      micStreamRef.current = await requestMicrophoneStream();
    } catch (error) {
      console.warn('Microphone not available:', error);
    }
  }

  if (requestedTargets.has('screen') && screenCheck.allowed && screenCaptureSuccess) {
    await waitForScreenTracksToStabilize();
  }

  const gpsCheck = canRequestPermission(capabilities, 'geolocation');
  if (requestedTargets.has('location') && gpsCheck.allowed && !locationWatchRef.current) {
    setPermissionStep('Activando ubicación GPS...');
    try {
      locationWatchRef.current = startLocationUpdates(sessionId, lastGpsUpdateRef);
    } catch (error) {
      console.warn('Geolocation not available:', error);
    }
  }
}

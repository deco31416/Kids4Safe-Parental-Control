import type { MutableRefObject } from 'react';
import type { ClientCapabilities } from '@/types/capabilities';
import type { QRPolicy } from '@/features/session/types/session.types';
import { watchLocation } from '@/lib/device';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

type PolicyEvaluationResult = {
  ok: boolean;
  errorMessage?: string;
};

type PermissionStatusPayload = {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
  location: boolean;
};

export async function sendSessionCapabilities(sessionId: string, capabilities: ClientCapabilities) {
  try {
    await fetch(`/api/session/${sessionId}/capabilities`, {
      method: 'POST',
      headers: getPublisherJsonHeaders(sessionId),
      body: JSON.stringify(capabilities),
    });
  } catch (error) {
    console.warn('Error sending capabilities:', error);
  }
}

export async function evaluateSessionPolicy(
  sessionId: string,
  qrPolicy: QRPolicy,
  capabilities: ClientCapabilities
): Promise<PolicyEvaluationResult> {
  try {
    const policyRes = await fetch(`/api/session/${sessionId}/evaluate-policy`, {
      method: 'POST',
      headers: getPublisherJsonHeaders(sessionId),
      body: JSON.stringify({
        qr_policy: qrPolicy,
        device_context: {
          device_type: capabilities.deviceType,
          os: capabilities.os.family,
          browser: capabilities.browser.family,
          capabilities: {
            camera: capabilities.camera.available,
            microphone: capabilities.audio.microphone,
            screenShare: capabilities.screen.canCapture,
            gps: capabilities.geolocation.available,
          },
        },
        session_state: { sessionId },
      }),
    });

    if (!policyRes.ok) {
      const errorData = await policyRes.json();
      return {
        ok: false,
        errorMessage: `Acceso denegado: ${errorData.reason || 'Policy no permite continuar'}`,
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error evaluating policy:', error);
    return {
      ok: false,
      errorMessage: 'No se pudo verificar permisos requeridos',
    };
  }
}

export function startLocationUpdates(
  sessionId: string,
  lastGpsUpdateRef: MutableRefObject<number>
) {
  return watchLocation(async (position) => {
    const now = Date.now();
    if (now - lastGpsUpdateRef.current < 10000) return;
    lastGpsUpdateRef.current = now;

    try {
      await fetch(`/api/session/${sessionId}/location`, {
        method: 'POST',
        headers: getPublisherJsonHeaders(sessionId),
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        }),
      });
    } catch (error) {
      console.warn('Error sending location:', error);
    }
  });
}

export async function sendDeviceInfo(sessionId: string) {
  try {
    const { getDeviceInfo } = await import('@/lib/device');
    const deviceInfo = await getDeviceInfo();
    await fetch(`/api/session/${sessionId}/device-info`, {
      method: 'POST',
      headers: getPublisherJsonHeaders(sessionId),
      body: JSON.stringify(deviceInfo),
    });
    console.log('✅ Device info enviado al backend');
  } catch (error) {
    console.warn('⚠️ Error enviando device info:', error);
  }
}

export async function updatePermissionStatus(
  sessionId: string,
  payload: PermissionStatusPayload
) {
  try {
    await fetch(`/api/session/${sessionId}/permissions`, {
      method: 'POST',
      headers: getPublisherJsonHeaders(sessionId),
      body: JSON.stringify(payload),
    });
    console.log('✅ Permisos actualizados en backend');
  } catch (error) {
    console.warn('⚠️ Error actualizando permisos:', error);
  }
}

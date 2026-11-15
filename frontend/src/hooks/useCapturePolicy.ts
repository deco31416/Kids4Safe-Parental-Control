'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ClientCapabilities } from '@/types/capabilities';

export interface CapturePolicy {
  intervals: {
    camera: number;
    screen: number;
    microphone: number;
    gps: number;
  };
  onlyIfChanged: boolean;
  changeThresholds: {
    gpsMeters: number;
    imageDiffPercent: number;
    audioLevelDelta: number;
  };
  policyPreset?: 'default' | 'high-frequency' | 'low-power' | 'custom';
}

interface UseCaptureHook {
  policy: CapturePolicy | null;
  effectiveIntervals: CapturePolicy['intervals'] | null;
  loading: boolean;
  error: string | null;
  shouldCapture: (target: 'camera' | 'screen' | 'microphone' | 'gps', changeValue: number) => boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener y aplicar Capture Policy desde el QR
 * 
 * @param qrId - ID del QR Code
 * @param capabilities - Capacidades del dispositivo (para determinar intervalos efectivos)
 */
export function useCapturePolicy(
  qrId: string | null,
  capabilities: ClientCapabilities | null
): UseCaptureHook {
  const [policy, setPolicy] = useState<CapturePolicy | null>(null);
  const [effectiveIntervals, setEffectiveIntervals] = useState<CapturePolicy['intervals'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (!qrId || !capabilities) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener intervalos efectivos según device type
      const deviceType = capabilities.deviceType;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/qr/${qrId}/capture-policy/effective/${deviceType}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch capture policy: ${response.status}`);
      }

      const data = await response.json();

      const rawIntervals = data?.effectiveIntervals ?? {};
      const normalizedIntervals: CapturePolicy['intervals'] = {
        camera: Number(rawIntervals.camera ?? 15000),
        screen: Number(rawIntervals.screen ?? 15000),
        microphone: Number(rawIntervals.microphone ?? rawIntervals.mic ?? rawIntervals.audio ?? 15000),
        gps: Number(rawIntervals.gps ?? 30000),
      };

      const fetchedPolicy: CapturePolicy = {
        intervals: normalizedIntervals,
        onlyIfChanged: data.onlyIfChanged ?? true,
        changeThresholds: data.changeThresholds || {
          gpsMeters: 10,
          imageDiffPercent: 5,
          audioLevelDelta: 10,
        },
        policyPreset: data.policyPreset,
      };

      setPolicy(fetchedPolicy);
      setEffectiveIntervals(normalizedIntervals);

      console.log('✅ [CapturePolicy] Loaded:', {
        deviceType,
        intervals: normalizedIntervals,
        onlyIfChanged: data.onlyIfChanged,
        preset: data.policyPreset,
      });
    } catch (err: any) {
      console.error('❌ [CapturePolicy] Error:', err);
      setError(err.message);

      // Fallback a defaults
      const fallbackIntervals = {
        camera: 15000,
        screen: 15000,
        microphone: 15000,
        gps: 30000,
      };

      setPolicy({
        intervals: fallbackIntervals,
        onlyIfChanged: true,
        changeThresholds: {
          gpsMeters: 10,
          imageDiffPercent: 5,
          audioLevelDelta: 10,
        },
        policyPreset: 'default',
      });
      setEffectiveIntervals(fallbackIntervals);
    } finally {
      setLoading(false);
    }
  }, [qrId, capabilities]);

  useEffect(() => {
    fetchPolicy();
    const interval = setInterval(fetchPolicy, 60000);

    return () => clearInterval(interval);
  }, [fetchPolicy]);

  /**
   * Valida si debe capturar según umbral de cambio
   */
  const shouldCapture = useCallback(
    (target: 'camera' | 'screen' | 'microphone' | 'gps', changeValue: number): boolean => {
      if (!policy) return true; // Sin política, capturar siempre

      if (!policy.onlyIfChanged) return true; // Capturar siempre si no está habilitado

      const thresholds = policy.changeThresholds;

      switch (target) {
        case 'gps':
          return changeValue >= thresholds.gpsMeters;
        case 'camera':
        case 'screen':
          return changeValue >= thresholds.imageDiffPercent;
        case 'microphone':
          return changeValue >= thresholds.audioLevelDelta;
        default:
          return true;
      }
    },
    [policy]
  );

  return {
    policy,
    effectiveIntervals,
    loading,
    error,
    shouldCapture,
    refetch: fetchPolicy,
  };
}

/**
 * Calcula hash simple de imagen para detectar cambios
 * Compara con último hash guardado
 */
export function calculateImageDiff(
  currentImageData: ImageData,
  previousImageData: ImageData | null
): number {
  if (!previousImageData) return 100; // Primera captura, considerar 100% diferente

  const current = currentImageData.data;
  const previous = previousImageData.data;

  if (current.length !== previous.length) return 100;

  let diffPixels = 0;
  const totalPixels = current.length / 4; // RGBA

  // Comparar cada 10 pixels para optimizar performance
  for (let i = 0; i < current.length; i += 40) {
    // 40 = 10 pixels * 4 channels
    const rDiff = Math.abs(current[i] - previous[i]);
    const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
    const bDiff = Math.abs(current[i + 2] - previous[i + 2]);

    // Umbral de diferencia por canal
    if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
      diffPixels++;
    }
  }

  const sampledPixels = totalPixels / 10;
  const diffPercent = (diffPixels / sampledPixels) * 100;

  return Math.min(diffPercent, 100);
}

/**
 * Calcula delta de nivel de audio (dB)
 */
export function calculateAudioDelta(
  currentLevel: number,
  previousLevel: number | null
): number {
  if (previousLevel === null) return 100; // Primera captura

  return Math.abs(currentLevel - previousLevel);
}

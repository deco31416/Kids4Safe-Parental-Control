/**
 * 📡 HOOK: Network Metrics Assessment (Desktop Only)
 * ===================================================
 * 
 * Captura métricas de red para estimar ubicación en DESKTOP/LAPTOP.
 * Se ejecuta automáticamente después de detectar capabilities.
 * 
 * - Solo se activa en desktop/laptop (NO mobile)
 * - Captura RTT WebRTC, WebSocket, HTTP TTFB
 * - Envía métricas al backend para correlación
 * - Recibe GeoAssessment con confidence score
 * 
 * UX: Muestra "Ubicación estimada" con nivel de precisión.
 */

import { useEffect, useState } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';
import { probeNetworkForDesktop, type NetworkMetrics } from '@/lib/network-probe';

export interface GeoAssessment {
  estimatedCountry: string;
  estimatedRegion?: string;
  estimatedCity?: string;
  estimatedLat?: number;
  estimatedLng?: number;
  accuracyRadiusKm: number;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  signalsUsed: string[];
  flags: string[];
  method: 'ip-only' | 'multi-signal' | 'trilateration' | 'ml-enhanced';
  processedAt: string;
}

interface NetworkAssessmentResult {
  metrics: NetworkMetrics | null;
  assessment: GeoAssessment | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para capturar métricas y obtener assessment
 */
export function useNetworkAssessment(
  sessionId: string,
  isDesktop: boolean,
  enabled: boolean = true,
): NetworkAssessmentResult {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [assessment, setAssessment] = useState<GeoAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isDesktop || !sessionId) {
      return;
    }

    let cancelled = false;

    async function captureAndAssess() {
      setIsLoading(true);
      setError(null);

      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          'http://localhost:7000';

        console.log('📡 [NetworkAssessment] Iniciando captura...');

        // 1. Capturar métricas de red
        const capturedMetrics = await probeNetworkForDesktop(backendUrl);

        if (cancelled) return;

        if (!capturedMetrics) {
          setError('No se pudieron capturar métricas de red');
          setIsLoading(false);
          return;
        }

        setMetrics(capturedMetrics);
        console.log('✅ [NetworkAssessment] Métricas capturadas:', capturedMetrics);

        // 2. Enviar al backend para assessment
        const response = await fetch(`${backendUrl}/location/assess-desktop`, {
          method: 'POST',
          headers: getPublisherJsonHeaders(sessionId),
          body: JSON.stringify({
            sessionId,
            networkMetrics: capturedMetrics,
          }),
        });

        if (!response.ok) {
          throw new Error(`Assessment failed: ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.assessment) {
          setAssessment(data.assessment);
          console.log(
            `✅ [NetworkAssessment] Assessment recibido: ${data.assessment.estimatedCity || 'Unknown'}, ` +
            `Confidence=${data.assessment.confidenceScore}%`,
          );
          
          // 🆕 Advertencia si se detectó salto geográfico
          if (data.geographicJumpDetected) {
            console.warn(
              '🚨 [NetworkAssessment] SALTO GEOGRÁFICO IRREAL DETECTADO - ' +
              'La ubicación cambió >500km en <5min. Posible VPN, proxy o fraude.'
            );
          }
        } else {
          setError('No se recibió assessment válido');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('❌ [NetworkAssessment] Error:', err);
          setError(err.message || 'Error desconocido');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    // Ejecutar después de 2s (dar tiempo a que se cargue la página)
    const timer = setTimeout(() => {
      captureAndAssess();
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, isDesktop, enabled]);

  return { metrics, assessment, isLoading, error };
}

import { useEffect, useRef } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 💓 Hook para enviar heartbeat cada 10s al backend
 * 
 * 🔍 P0 #2: Heartbeat Compliance Monitoring
 * - Mantiene sesión viva en orchestrator (TTL 30s en Redis)
 * - Detecta delays y missed beats (forense)
 * - Diferencia red lenta vs evasión intencional
 */
export function useHeartbeat(sessionId: string | null, enabled = true) {
  const lastSuccessRef = useRef<number>(0);
  const missedCountRef = useRef<number>(0);
  const expectedIntervalMs = 10000; // 10 segundos

  useEffect(() => {
    if (!enabled || !sessionId) return;

    console.log('💓 [Heartbeat] Hook iniciado para sessionId:', sessionId);

    const sendHeartbeat = async () => {
      const now = Date.now();
      const timeSinceLast = lastSuccessRef.current ? now - lastSuccessRef.current : 0;

      try {
        console.log('💓 [Heartbeat] Enviando heartbeat...');
        const startTime = Date.now();
        const res = await fetch(`/api/session/${sessionId}/heartbeat`, { 
          method: 'POST',
          headers: getPublisherJsonHeaders(sessionId),
          body: JSON.stringify({
            clientTimestamp: now,
            expectedInterval: expectedIntervalMs,
            timeSinceLast,
            missedCount: missedCountRef.current,
          }),
        });
        const rtt = Date.now() - startTime;

        if (res.ok) {
          console.log('✅ [Heartbeat] Exitoso (RTT:', rtt, 'ms)');
          // Detectar delay (llegó tarde)
          if (timeSinceLast > expectedIntervalMs + 2000) {
            // Heartbeat llegó >2s tarde, puede ser red lenta o tab hidden
            console.warn(`⏱️ Heartbeat delayed: ${timeSinceLast}ms (expected ${expectedIntervalMs}ms)`);
            
            // Backend registrará HEARTBEAT_DELAYED
          }

          lastSuccessRef.current = now;
          missedCountRef.current = 0; // Reset contador
        } else {
          missedCountRef.current++;
          console.error('💔 [Heartbeat] Failed - Status:', res.status);
        }
      } catch (error) {
        missedCountRef.current++;
        console.error('💔 [Heartbeat] Error:', error);
        
        // Backend registrará HEARTBEAT_MISSED si contador > threshold
      }
    };

    // Heartbeat inicial inmediato
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, expectedIntervalMs);

    return () => clearInterval(interval);
  }, [sessionId, enabled]);
}



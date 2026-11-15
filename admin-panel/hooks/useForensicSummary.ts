import { useEffect, useState } from 'react';
import { AdminAPI } from '@/lib/admin-api';

export interface ForensicSummary {
  riskLevel: 'critical' | 'review' | 'normal';
  totalEvents: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  
  // Contadores específicos para lógica de riesgo
  heartbeatMissedCount: number;
  webrtcFailedCount: number;
  clipboardActivityCount: number;
  tabHiddenCount: number;
  trackEndedCount: number;
  beforeUnloadCount: number;
  
  // Último evento crítico para contexto
  lastCriticalEvent?: {
    type: string;
    timestamp: string;
  };
  
  // Flags de patterns sospechosos
  hasRapidDisconnectPattern: boolean; // TRACK_ENDED + BEFORE_UNLOAD <5s
}

interface UseForensicSummaryResult {
  summary: ForensicSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook para calcular resumen forense de una sesión
 * Analiza audit logs y determina nivel de riesgo según patterns
 */
export function useForensicSummary(sessionId: string | null | undefined): UseForensicSummaryResult {
  const [summary, setSummary] = useState<ForensicSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateSummary = async () => {
    if (!sessionId) {
      setSummary(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch audit logs de la sesión
      const res = await AdminAPI.getAuditLogs(`sessionId=${sessionId}&limit=500`);
      const logs = res.logs || [];

      // Inicializar contadores
      let criticalCount = 0;
      let warningCount = 0;
      let infoCount = 0;
      
      let heartbeatMissedCount = 0;
      let webrtcFailedCount = 0;
      let clipboardActivityCount = 0;
      let tabHiddenCount = 0;
      let trackEndedCount = 0;
      let beforeUnloadCount = 0;

      let lastCriticalEvent: ForensicSummary['lastCriticalEvent'] = undefined;
      let trackEndedTimestamp: number | null = null;
      let beforeUnloadTimestamp: number | null = null;

      // Procesar cada evento
      for (const log of logs) {
        // Contar por severidad
        if (log.severity === 'critical') criticalCount++;
        else if (log.severity === 'warning') warningCount++;
        else infoCount++;

        // Contar por tipo específico
        if (log.eventType === 'HEARTBEAT_MISSED') {
          heartbeatMissedCount++;
        } else if (log.eventType === 'WEBRTC_CONNECTION_FAILED' || log.eventType === 'WEBRTC_FAILED') {
          webrtcFailedCount++;
        } else if (
          log.eventType === 'CLIPBOARD_COPY' ||
          log.eventType === 'CLIPBOARD_PASTE' ||
          log.eventType === 'CLIPBOARD_CUT' ||
          log.eventType === 'SCREENSHOT_ATTEMPT'
        ) {
          clipboardActivityCount++;
        } else if (log.eventType === 'TAB_HIDDEN') {
          tabHiddenCount++;
        } else if (log.eventType === 'TRACK_ENDED') {
          trackEndedCount++;
          trackEndedTimestamp = new Date(log.timestamp).getTime();
        } else if (log.eventType === 'BEFORE_UNLOAD') {
          beforeUnloadCount++;
          beforeUnloadTimestamp = new Date(log.timestamp).getTime();
        }

        // Guardar último evento crítico
        if (log.severity === 'critical' && !lastCriticalEvent) {
          lastCriticalEvent = {
            type: log.eventType,
            timestamp: log.timestamp,
          };
        }
      }

      // Detectar pattern: TRACK_ENDED + BEFORE_UNLOAD <5s (posible ocultación deliberada)
      const hasRapidDisconnectPattern =
        trackEndedTimestamp !== null &&
        beforeUnloadTimestamp !== null &&
        Math.abs(trackEndedTimestamp - beforeUnloadTimestamp) < 5000;

      // Determinar nivel de riesgo según veredicto de auditoría
      let riskLevel: ForensicSummary['riskLevel'] = 'normal';

      // 🔴 CRÍTICO
      if (
        heartbeatMissedCount >= 3 ||
        webrtcFailedCount >= 1 ||
        hasRapidDisconnectPattern
      ) {
        riskLevel = 'critical';
      }
      // ⚠️ REVISAR
      else if (clipboardActivityCount >= 10 || tabHiddenCount >= 5) {
        riskLevel = 'review';
      }

      const forensicSummary: ForensicSummary = {
        riskLevel,
        totalEvents: logs.length,
        criticalCount,
        warningCount,
        infoCount,
        heartbeatMissedCount,
        webrtcFailedCount,
        clipboardActivityCount,
        tabHiddenCount,
        trackEndedCount,
        beforeUnloadCount,
        lastCriticalEvent,
        hasRapidDisconnectPattern,
      };

      setSummary(forensicSummary);
    } catch (err: any) {
      console.error('[useForensicSummary] Error:', err);
      setError(err.message || 'Error al calcular resumen forense');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateSummary();
  }, [sessionId]);

  return {
    summary,
    loading,
    error,
    refresh: calculateSummary,
  };
}

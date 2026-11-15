import { useEffect, useRef } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 🔍 P0 #5: Clipboard & Screenshot Attempt Detection
 * 
 * Objetivo forense:
 * - Detectar intento de copy/paste (NO captura contenido)
 * - Detectar intento de screenshot (PrintScreen, Win+Shift+S, etc.)
 * - Evidencia de comportamiento sospechoso (exfiltración de datos)
 * 
 * IMPORTANTE:
 * - NO captura contenido del clipboard (privacidad)
 * - Solo registra que hubo actividad (timestamp, tipo)
 * - Screenshot detection es limitado (no detecta herramientas externas)
 */

export interface ClipboardEvent {
  type: 'CLIPBOARD_COPY' | 'CLIPBOARD_PASTE' | 'CLIPBOARD_CUT' | 'SCREENSHOT_ATTEMPT';
  timestamp: number;
  target?: string; // tagName del elemento (INPUT, TEXTAREA, DIV)
}

interface UseClipboardMonitorOptions {
  sessionId: string;
  backendUrl: string;
  enabled?: boolean;
  onClipboardEvent?: (event: ClipboardEvent) => void;
}

export function useClipboardMonitor({ 
  sessionId, 
  backendUrl, 
  enabled = true,
  onClipboardEvent 
}: UseClipboardMonitorOptions) {
  const lastEventRef = useRef<{ type: string; timestamp: number } | null>(null);
  const eventCountRef = useRef<Map<string, number>>(new Map()); // Aggregation counter

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const sendEvent = async (event: ClipboardEvent) => {
      // Debounce 1s para eventos ruidosos (copy/paste repetitivo)
      if (
        lastEventRef.current?.type === event.type && 
        Date.now() - lastEventRef.current.timestamp < 1000
      ) {
        return;
      }

      lastEventRef.current = { type: event.type, timestamp: Date.now() };

      // Aggregation: contar eventos del mismo tipo
      const count = (eventCountRef.current.get(event.type) || 0) + 1;
      eventCountRef.current.set(event.type, count);

      // Callback opcional
      onClipboardEvent?.(event);

      // Enviar al backend
      try {
        await fetch(`${backendUrl}/session/${sessionId}/clipboard-event`, {
          method: 'POST',
          headers: getPublisherJsonHeaders(sessionId),
          body: JSON.stringify({
            ...event,
            aggregationCount: count, // Cuántas veces ocurrió este evento en la sesión
          }),
        });
      } catch (error) {
        console.error('Error enviando clipboard event:', error);
      }
    };

    // 1. Detectar copy
    const handleCopy = (e: globalThis.ClipboardEvent) => {
      sendEvent({
        type: 'CLIPBOARD_COPY',
        timestamp: Date.now(),
        target: (e.target as HTMLElement)?.tagName,
      });
    };

    // 2. Detectar paste
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      sendEvent({
        type: 'CLIPBOARD_PASTE',
        timestamp: Date.now(),
        target: (e.target as HTMLElement)?.tagName,
      });
    };

    // 3. Detectar cut
    const handleCut = (e: globalThis.ClipboardEvent) => {
      sendEvent({
        type: 'CLIPBOARD_CUT',
        timestamp: Date.now(),
        target: (e.target as HTMLElement)?.tagName,
      });
    };

    // 4. Detectar PrintScreen (limitado, solo algunas teclas)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen (Windows)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        sendEvent({
          type: 'SCREENSHOT_ATTEMPT',
          timestamp: Date.now(),
        });
      }

      // Win+Shift+S (Windows Snipping Tool)
      if (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        sendEvent({
          type: 'SCREENSHOT_ATTEMPT',
          timestamp: Date.now(),
        });
      }

      // Cmd+Shift+3/4/5 (macOS)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        sendEvent({
          type: 'SCREENSHOT_ATTEMPT',
          timestamp: Date.now(),
        });
      }
    };

    // Registrar listeners
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionId, backendUrl, enabled, onClipboardEvent]);
}

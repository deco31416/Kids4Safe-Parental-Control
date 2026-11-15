import { useEffect, useRef } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 🔍 P0 #1: Tab Visibility & Focus Tracking
 * 
 * Objetivo forense:
 * - Diferenciar abandono voluntario vs fallo técnico
 * - Detectar evasión intencional (cambiar de tab durante sesión)
 * - Evidencia de continuidad de atención
 * 
 * NO captura contenido del usuario.
 * Solo registra eventos de visibilidad.
 */

export interface TabVisibilityEvent {
  type: 'TAB_HIDDEN' | 'TAB_VISIBLE' | 'WINDOW_BLUR' | 'WINDOW_FOCUS' | 'PAGE_HIDE' | 'BEFORE_UNLOAD';
  timestamp: number;
  visibilityState: DocumentVisibilityState;
  focused: boolean;
  persisted?: boolean;
}

interface UseTabVisibilityOptions {
  sessionId: string;
  backendUrl?: string;
  enabled?: boolean;
  onEvent?: (event: TabVisibilityEvent) => void;
}

export function useTabVisibility({ 
  sessionId, 
  enabled = true,
  onEvent 
}: UseTabVisibilityOptions) {
  const lastEventRef = useRef<TabVisibilityEvent | null>(null);
  const eventCountRef = useRef<Map<string, number>>(new Map()); // Aggregation counter

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const sendEvent = async (event: TabVisibilityEvent) => {
      // Evitar duplicados consecutivos
      if (lastEventRef.current?.type === event.type && 
          Date.now() - lastEventRef.current.timestamp < 500) {
        return;
      }

      lastEventRef.current = event;

      // Aggregation: contar eventos del mismo tipo
      const count = (eventCountRef.current.get(event.type) || 0) + 1;
      eventCountRef.current.set(event.type, count);

      // Callback opcional (para UI o logging local)
      onEvent?.(event);

      // Enviar al backend
      try {
        const response = await fetch(`/api/session/${sessionId}/tab-event`, {
          method: 'POST',
          headers: getPublisherJsonHeaders(sessionId),
          body: JSON.stringify({
            ...event,
            aggregationCount: count, // Cuántas veces ocurrió este evento en la sesión
          }),
        });

        if (!response.ok) {
          console.warn('Tab event rechazado:', response.status);
        }
      } catch (error) {
        console.error('Error enviando tab event:', error);
        // No bloqueante, la sesión continúa
      }
    };

    const createEvent = (type: TabVisibilityEvent['type']): TabVisibilityEvent => ({
      type,
      timestamp: Date.now(),
      visibilityState: document.visibilityState,
      focused: document.hasFocus(),
    });

    // 1. visibilitychange (tab cambia entre visible/hidden)
    const handleVisibilityChange = () => {
      const event = createEvent(
        document.visibilityState === 'hidden' ? 'TAB_HIDDEN' : 'TAB_VISIBLE'
      );
      sendEvent(event);
    };

    // 2. focus/blur (ventana pierde/gana foco)
    const handleFocus = () => {
      sendEvent(createEvent('WINDOW_FOCUS'));
    };

    const handleBlur = () => {
      sendEvent(createEvent('WINDOW_BLUR'));
    };

    // 3. pagehide (página se está descargando - puede ser navegación o cierre)
    const handlePageHide = (e: PageTransitionEvent) => {
      sendEvent({
        ...createEvent('PAGE_HIDE'),
        persisted: e.persisted, // true si va a bfcache (Back-Forward Cache)
      });
    };

    // 4. beforeunload (usuario está intentando cerrar/navegar fuera)
    const handleBeforeUnload = () => {
      sendEvent(createEvent('BEFORE_UNLOAD'));
    };

    // Registrar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Evento inicial (sesión inicia con tab visible y focused)
    sendEvent(createEvent('TAB_VISIBLE'));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, enabled, onEvent]);
}

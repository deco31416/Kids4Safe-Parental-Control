import { useCallback, useState, type MutableRefObject } from 'react';
import { registerWebPushSubscription, showLocalWebPushTestNotification } from '@/lib/web-push';

export type WebPushStatus = 'idle' | 'saving' | 'enabled' | 'unsupported' | 'denied' | 'not-configured' | 'error';

type UseSessionWebPushOptions = {
  sessionId: string;
  publisherTokenRef: MutableRefObject<string | null>;
};

export function useSessionWebPush({ sessionId, publisherTokenRef }: UseSessionWebPushOptions) {
  const [webPushStatus, setWebPushStatus] = useState<WebPushStatus>('idle');

  const enableWebPush = useCallback(async (requestPermission = true) => {
    try {
      setWebPushStatus('saving');
      const result = await registerWebPushSubscription({
        sessionId,
        publisherToken: publisherTokenRef.current,
        requestPermission,
      });

      if (result.enabled) {
        setWebPushStatus('enabled');
        return;
      }

      if (result.reason === 'unsupported' || result.reason === 'notifications_unsupported') {
        setWebPushStatus('unsupported');
      } else if (result.reason === 'permission_not_granted') {
        setWebPushStatus('denied');
      } else if (result.reason === 'backend_not_configured') {
        setWebPushStatus('not-configured');
      } else if (result.reason === 'permission_default') {
        setWebPushStatus('idle');
      } else {
        setWebPushStatus('idle');
      }
    } catch (error) {
      console.warn('⚠️ [WebPush] No se pudo registrar suscripción:', error);
      setWebPushStatus('error');
    }
  }, [publisherTokenRef, sessionId]);

  const testWebPush = useCallback(async () => {
    try {
      await showLocalWebPushTestNotification(sessionId);
    } catch (error) {
      console.warn('⚠️ [WebPush] No se pudo mostrar prueba local:', error);
      setWebPushStatus('error');
    }
  }, [sessionId]);

  return {
    webPushStatus,
    enableWebPush,
    testWebPush,
  };
}

import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { SessionInfo, SessionState } from '@/features/session/types/session.types';
import { getPublisherJsonHeaders, setPublisherSessionToken } from '@/lib/publisher-auth';

type ReactivateTarget = 'camera' | 'microphone' | 'screen' | 'location';

type UseSessionBootstrapOptions = {
  sessionId: string;
  publisherTokenRef: MutableRefObject<string | null>;
  enableWebPush: (requestPermission?: boolean) => Promise<void>;
  startAllCapture: (
    reactivateTargets?: ReactivateTarget[],
    sessionInfoOverride?: SessionInfo | null,
  ) => Promise<void>;
  setSessionState: Dispatch<SetStateAction<SessionState>>;
  setSessionInfo: Dispatch<SetStateAction<SessionInfo | null>>;
  setPublisherTokenReady: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export function useSessionBootstrap({
  sessionId,
  publisherTokenRef,
  enableWebPush,
  startAllCapture,
  setSessionState,
  setSessionInfo,
  setPublisherTokenReady,
  setError,
}: UseSessionBootstrapOptions) {
  const hasLoadedRef = useRef(false);

  const loadSessionConfig = useCallback(async () => {
    try {
      setSessionState('initializing');

      const storedSession = localStorage.getItem(`session_${sessionId}`);
      publisherTokenRef.current = storedSession ? JSON.parse(storedSession).publisherToken || null : null;

      if (!publisherTokenRef.current) {
        setError('Sesión sin token de publicador. Vuelve a iniciar desde el QR/link.');
        setSessionState('error');
        return;
      }

      setPublisherSessionToken(sessionId, publisherTokenRef.current);

      // Validate against the public endpoint to keep publisher bootstrap decoupled from admin routes.
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
      const sessionRes = await fetch(`${backendUrl}/session/${sessionId}/public`, {
        cache: 'no-store',
      });
      if (!sessionRes.ok) {
        setError('Sesión no encontrada o inválida');
        setSessionState('error');
        return;
      }

      const sessionData = await sessionRes.json();

      // Register push early if the browser already has notification permission.
      await enableWebPush(false);

      const qrRes = await fetch(`/api/qr/${sessionData.qrId}/config`);
      if (!qrRes.ok) {
        setError('No se pudo cargar la configuración');
        setSessionState('error');
        return;
      }

      const qrData = await qrRes.json();
      const destinationUrl =
        qrData.destinationUrl ||
        qrData.destination_url ||
        qrData.config?.redirect_url ||
        qrData.config?.destinationUrl ||
        'https://www.google.com';

      const nextSessionInfo: SessionInfo = {
        sessionId,
        qrId: sessionData.qrId,
        redirectUrl: destinationUrl,
        qrPolicy: {
          policyType: qrData.policies?.policyType || 'STANDARD',
          permissionsRequired: qrData.policies?.permissionsRequired || [],
          permissionsOptional: qrData.policies?.permissionsOptional || [],
          maxUses: qrData.policies?.maxUses,
          ttlSeconds: qrData.policies?.ttlSeconds,
        },
      };

      setSessionInfo(nextSessionInfo);
      setPublisherTokenReady(true);

      await fetch(`/api/session/${sessionId}/content-redirect`, {
        method: 'POST',
        headers: getPublisherJsonHeaders(sessionId),
        body: JSON.stringify({
          contentUrl: qrData.config?.redirect_url,
          redirectedAt: Date.now(),
        }),
      });

      await startAllCapture(undefined, nextSessionInfo);
    } catch (error: any) {
      console.error('Error loading session:', error);
      setError(error.message || 'Error al cargar contenido');
      setSessionState('error');
    }
  }, [
    sessionId,
    publisherTokenRef,
    enableWebPush,
    startAllCapture,
    setSessionState,
    setSessionInfo,
    setPublisherTokenReady,
    setError,
  ]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void loadSessionConfig();
  }, [loadSessionConfig]);
}

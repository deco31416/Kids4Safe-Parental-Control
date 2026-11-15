import { useEffect, useState } from 'react';
import type {
  JoinResponse,
  PublisherState,
} from '@/features/publisher/types/publisher.types';
import { getBrowserDeviceId } from '@/lib/browser-identity';

type UsePublisherJoinOptions = {
  qrId: string;
  apiBase: string;
};

const JOIN_REQUEST_CACHE_MS = 5000;
const joinRequestCache = new Map<string, { expiresAt: number; promise: Promise<JoinResponse> }>();

function getJoinRequest(key: string, createRequest: () => Promise<JoinResponse>) {
  const cached = joinRequestCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = createRequest();
  joinRequestCache.set(key, {
    expiresAt: Date.now() + JOIN_REQUEST_CACHE_MS,
    promise,
  });

  promise.catch(() => {
    joinRequestCache.delete(key);
  });

  return promise;
}

export function usePublisherJoin({ qrId, apiBase }: UsePublisherJoinOptions) {
  const [pageState, setPageState] = useState<PublisherState>('initializing');
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setPageState('initializing');
        const data = await getJoinRequest(`${apiBase}:${qrId}`, async () => {
          const res = await fetch(`${apiBase}/session/qr/${qrId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              browserDeviceId: getBrowserDeviceId(),
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `HTTP ${res.status}`);
          }

          return (await res.json()) as JoinResponse;
        });

        if (mounted) {
          setJoin(data);
          setPageState('consent-required');
        }
      } catch (error: unknown) {
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Error al iniciar sesión');
          setPageState('error');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [apiBase, qrId]);

  return {
    pageState,
    setPageState,
    join,
    setJoin,
    error,
    setError,
  };
}

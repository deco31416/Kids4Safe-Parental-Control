'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SessionRecording } from './recording-media.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

function token() {
  return sessionStorage.getItem('auth_token') || localStorage.getItem('token');
}

async function backendRequest(path: string, init?: RequestInit) {
  if (!BACKEND_URL) throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token() || ''}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }
  return response.json();
}

export function useSessionRecordings(sessionId?: string, open = false) {
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await backendRequest(`/recordings/session/${encodeURIComponent(sessionId)}`);
      setRecordings(data.recordings || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las grabaciones');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open) void load();
    else setRecordings([]);
  }, [load, open]);

  const remove = async (path: string, body?: object) => {
    setDeleting(true);
    setError(null);
    try {
      await backendRequest(path, {
        method: 'DELETE',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await load();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la grabación');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleting,
    error,
    load,
    loading,
    recordings,
    removeAll: () => remove(`/recordings/session/${encodeURIComponent(sessionId || '')}/all`),
    removeMany: (ids: string[]) => remove('/recordings/batch/multiple', { ids }),
    removeOne: (id: string) => remove(`/recordings/${encodeURIComponent(id)}`),
  };
}

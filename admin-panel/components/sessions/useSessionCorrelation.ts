'use client';

import { useEffect, useState } from 'react';

export interface CorrelatedSession {
  sessionId: string;
  qrId: string;
  status: string;
  createdAt: string;
  location?: { city?: string; country?: string };
}

export interface CorrelationFlags {
  isCorrelated: boolean;
  correlationCount: number;
  correlationRisk: 'low' | 'medium' | 'high' | 'critical';
  firstDetectedAt?: string;
  lastCheckedAt?: string;
}

export function useSessionCorrelation(sessionId: string) {
  const [loading, setLoading] = useState(true);
  const [correlatedSessions, setSessions] = useState<CorrelatedSession[]>([]);
  const [correlationFlags, setFlags] = useState<CorrelationFlags | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/session/${encodeURIComponent(sessionId)}/correlation`,
          { headers: { Authorization: `Bearer ${token || ''}` }, signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Correlación HTTP ${response.status}`);
        const data = await response.json();
        setSessions(data.correlatedSessions || []);
        setFlags(data.correlationFlags || null);
      } catch (error) {
        if (!controller.signal.aborted) console.warn('No se pudo cargar correlación:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [revision, sessionId]);

  return {
    correlatedSessions,
    correlationFlags,
    loading,
    refresh: () => setRevision((current) => current + 1),
  };
}

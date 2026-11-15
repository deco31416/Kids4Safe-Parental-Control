'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminAPI } from '@/lib/admin-api';
import type { ConnectionStatus, HealthResponse, HealthServiceStatus } from './types';

export function useSystemStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | undefined>(undefined);

  const backendUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000',
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminAPI.getSystemHealth();
      setHealth(data);
      setLastCheckedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar /health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connections: ConnectionStatus = useMemo(() => {
    const redis = (health?.infrastructure?.redis || health?.services?.redis || health?.redis) as HealthServiceStatus | undefined;
    const mongodb = (health?.infrastructure?.mongodb || health?.services?.mongodb || health?.mongodb) as HealthServiceStatus | undefined;
    const redisKnown = !!redis;
    const mongoKnown = !!mongodb;
    const redisOk = redis?.status === 'up' || !!redis?.connected;
    const mongoOk = mongodb?.status === 'up' || !!mongodb?.connected;

    return {
      redisLabel: redisKnown ? (redisOk ? 'Connected' : 'No conectado') : 'No reportado',
      mongodbLabel: mongoKnown ? (mongoOk ? 'Connected' : 'No conectado') : 'No reportado',
      lastCheckedAt,
    };
  }, [health, lastCheckedAt]);

  return { backendUrl, health, connections, refresh, loading, error };
}

export type { HealthResponse, HealthServiceStatus } from '@/lib/system-health';

export type ConnectionStatus = {
  redisLabel: string;
  mongodbLabel: string;
  lastCheckedAt?: number;
};

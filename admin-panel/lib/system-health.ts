export type HealthResponse = {
  status?: string;
  timestamp?: string;
  uptime?: number;
  redis?: { connected?: boolean };
  mongodb?: { connected?: boolean };
  services?: Record<string, HealthServiceStatus>;
  infrastructure?: Record<string, HealthServiceStatus>;
};

export type HealthServiceStatus = {
  status?: 'up' | 'down' | 'degraded' | 'not-configured' | string;
  connected?: boolean;
  configured?: boolean;
  url?: string;
  responseTime?: number;
  error?: string;
  uptime?: number;
  service?: string;
  lastCheck?: string;
};

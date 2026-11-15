export type IceServer = {
  credential?: string;
  urls: string | string[];
  username?: string;
};

export type IceServerSource =
  | 'metered-ephemeral'
  | 'metered-api'
  | 'metered-env'
  | 'env-json'
  | 'stun-fallback';

export type IceServerResponse = {
  iceServers: IceServer[];
  source: IceServerSource;
  ttlSeconds: number;
};

export const FALLBACK_ICE_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function isValidIceServers(value: unknown): value is IceServer[] {
  return Array.isArray(value) && value.length > 0 && value.every((server) => {
    if (!server || typeof server !== 'object') return false;
    const urls = (server as IceServer).urls;
    return typeof urls === 'string' ||
      (Array.isArray(urls) && urls.every((url) => typeof url === 'string'));
  });
}

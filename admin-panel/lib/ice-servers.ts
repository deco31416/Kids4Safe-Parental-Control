const fallbackIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS_JSON;
  if (!raw) return fallbackIceServers;

  try {
    const servers = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(servers) && servers.every((server) => server?.urls)
      ? servers
      : fallbackIceServers;
  } catch {
    return fallbackIceServers;
  }
}

type IceCacheEntry = {
  expiresAt: number;
  servers: RTCIceServer[];
};

const iceCache = new Map<string, IceCacheEntry>();
const pendingRequests = new Map<string, Promise<RTCIceServer[]>>();

type IceServerAuthOptions = {
  adminToken?: string | null;
  mobileSessionToken?: string | null;
  publisherToken?: string | null;
  sessionId?: string | null;
};

function buildIceHeaders(options?: IceServerAuthOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options?.adminToken) {
    headers.Authorization = `Bearer ${options.adminToken}`;
  }
  if (options?.sessionId) {
    headers['X-Session-Id'] = options.sessionId;
  }
  if (options?.publisherToken) {
    headers['X-Publisher-Session-Token'] = options.publisherToken;
  }
  if (options?.mobileSessionToken) {
    headers['X-Mobile-Session-Token'] = options.mobileSessionToken;
  }

  return headers;
}

export async function loadIceServers(options?: IceServerAuthOptions): Promise<RTCIceServer[]> {
  const cacheKey = options?.sessionId || 'default';
  const cached = iceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.servers;
  if (cached) iceCache.delete(cacheKey);

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = requestIceServers(options)
    .finally(() => pendingRequests.delete(cacheKey));
  pendingRequests.set(cacheKey, request);
  return request;
}

async function requestIceServers(options?: IceServerAuthOptions): Promise<RTCIceServer[]> {
  const cacheKey = options?.sessionId || 'default';
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
    const query = options?.sessionId ? `?sessionId=${encodeURIComponent(options.sessionId)}` : '';
    const response = await fetch(`${backendUrl}/webrtc/ice-servers${query}`, {
      cache: 'no-store',
      headers: buildIceHeaders(options),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const servers = payload?.iceServers as RTCIceServer[] | undefined;
    if (!Array.isArray(servers) || !servers.every((server) => server?.urls)) {
      return getIceServers();
    }

    const ttlSeconds = Number(payload?.ttlSeconds);
    const safeTtl = Number.isFinite(ttlSeconds)
      ? Math.max(30, ttlSeconds - 30)
      : 270;
    iceCache.set(cacheKey, {
      expiresAt: Date.now() + safeTtl * 1000,
      servers,
    });
    return servers;
  } catch {
    return getIceServers();
  }
}

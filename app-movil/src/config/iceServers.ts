type IceServer = {
  credential?: string;
  urls: string | string[];
  username?: string;
};

const fallbackServers: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

function parseConfiguredServers(): IceServer[] {
  const raw = process.env.EXPO_PUBLIC_ICE_SERVERS_JSON;
  if (!raw) return fallbackServers;

  try {
    const servers = JSON.parse(raw) as IceServer[];
    return Array.isArray(servers) && servers.every((server) => server?.urls) ? servers : fallbackServers;
  } catch {
    return fallbackServers;
  }
}

export const ICE_SERVERS = parseConfiguredServers();

type IceCacheEntry = {
  expiresAt: number;
  servers: IceServer[];
};

const iceCache = new Map<string, IceCacheEntry>();
const pendingRequests = new Map<string, Promise<IceServer[]>>();

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
    headers["X-Session-Id"] = options.sessionId;
  }
  if (options?.publisherToken) {
    headers["X-Publisher-Session-Token"] = options.publisherToken;
  }
  if (options?.mobileSessionToken) {
    headers["X-Mobile-Session-Token"] = options.mobileSessionToken;
  }

  return headers;
}

export async function getIceServers(options?: IceServerAuthOptions) {
  const cacheKey = options?.sessionId || "default";
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

async function requestIceServers(options?: IceServerAuthOptions): Promise<IceServer[]> {
  const cacheKey = options?.sessionId || "default";
  try {
    const { API_URL } = await import("./apiUrl");
    const query = options?.sessionId ? `?sessionId=${encodeURIComponent(options.sessionId)}` : "";
    const response = await fetch(`${API_URL}/webrtc/ice-servers${query}`, {
      headers: buildIceHeaders(options)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const servers = payload?.iceServers;
    if (!Array.isArray(servers) || !servers.every((server) => server?.urls)) {
      return ICE_SERVERS;
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
    return ICE_SERVERS;
  }
}

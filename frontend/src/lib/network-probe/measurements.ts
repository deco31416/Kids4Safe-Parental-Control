import type { NetworkMetrics, STUNServer, WebRtcProbeResult } from './types';

const STUN_SERVERS: STUNServer[] = [
  { url: 'stun:stun.l.google.com:19302', location: 'USA-East', lat: 37.7749, lng: -122.4194 },
  { url: 'stun:stun1.l.google.com:19302', location: 'USA-West', lat: 40.7128, lng: -74.0060 },
  { url: 'stun:stun.cloudflare.com:3478', location: 'Global-CDN', lat: 51.5074, lng: -0.1278 },
  { url: 'stun:global.stun.twilio.com:3478', location: 'Twilio-Global', lat: 37.7749, lng: -122.4194 },
];

async function measureWebRTCRTT(stunServer: STUNServer): Promise<{ rtt: number; candidateTypes: string[] }> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const timeout = setTimeout(() => resolve({ rtt: -1, candidateTypes: [] }), 5000);
    const candidateTypes = new Set<string>();

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunServer.url }],
      });

      let resolved = false;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const type = event.candidate.type;
          if (type) candidateTypes.add(type);

          if (!resolved) {
            const rtt = performance.now() - startTime;
            clearTimeout(timeout);
            resolved = true;
            pc.close();
            resolve({ rtt, candidateTypes: Array.from(candidateTypes) });
          }
        }
      };

      pc.createDataChannel('probe');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          pc.close();
          resolve({ rtt: -1, candidateTypes: Array.from(candidateTypes) });
        });
    } catch {
      clearTimeout(timeout);
      resolve({ rtt: -1, candidateTypes: [] });
    }
  });
}

export async function measureStunServers(): Promise<WebRtcProbeResult[]> {
  return Promise.all(
    STUN_SERVERS.map(async (server) => {
      const result = await measureWebRTCRTT(server);
      console.log(`  ↳ STUN ${server.location}: ${result.rtt.toFixed(0)}ms, candidates: ${result.candidateTypes.join(',')}`);
      return {
        server: server.location,
        rtt: result.rtt,
        candidateTypes: result.candidateTypes,
      };
    })
  );
}

export async function measureWebSocketRTT(wsUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const timeout = setTimeout(() => resolve(-1), 3000);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const rtt = performance.now() - startTime;
        clearTimeout(timeout);
        ws.close();
        resolve(rtt);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(-1);
      };
    } catch {
      clearTimeout(timeout);
      resolve(-1);
    }
  });
}

export async function measureHTTPTTFB(url: string): Promise<number> {
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
    });

    if (!response.ok) return -1;
    return performance.now() - startTime;
  } catch {
    return -1;
  }
}

export function getConnectionInfo(): Pick<NetworkMetrics, 'connectionType' | 'downlink' | 'rtt'> {
  const nav = navigator as any;

  if (!nav.connection && !nav.mozConnection && !nav.webkitConnection) {
    return {
      connectionType: 'unknown',
      downlink: undefined,
      rtt: undefined,
    };
  }

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  return {
    connectionType: connection.effectiveType || 'unknown',
    downlink: connection.downlink,
    rtt: connection.rtt,
  };
}

export async function measureRegionLatency(
  backendUrl: string,
  region: string,
  samples = 5
): Promise<{ region: string; minRtt: number; avgRtt: number; jitter: number }> {
  const rtts: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      await fetch(`${backendUrl}/ping`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
      });
      rtts.push(performance.now() - start);
    } catch (error) {
      console.warn(`[NetworkProbe] Fallo en sample ${i + 1}/${samples} para región ${region}:`, error);
    }

    if (i < samples - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (rtts.length === 0) {
    return { region, minRtt: -1, avgRtt: -1, jitter: -1 };
  }

  const minRtt = Math.min(...rtts);
  const avgRtt = rtts.reduce((a, b) => a + b, 0) / rtts.length;
  const variance = rtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgRtt, 2), 0) / rtts.length;
  const jitter = Math.sqrt(variance);

  return { region, minRtt, avgRtt, jitter };
}

export function summarizeWebrtcResults(webrtcResults: WebRtcProbeResult[]) {
  const allCandidateTypes = new Set<string>();
  webrtcResults.forEach((result) => {
    result.candidateTypes?.forEach((type) => allCandidateTypes.add(type));
  });

  const validRtts = webrtcResults.filter((result) => result.rtt > 0).map((result) => result.rtt);
  const avgRtt = validRtts.length > 0 ? validRtts.reduce((a, b) => a + b, 0) / validRtts.length : 0;
  const jitter = validRtts.length > 1
    ? Math.sqrt(validRtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgRtt, 2), 0) / validRtts.length)
    : 0;

  return {
    jitter,
    packetLossEstimate: webrtcResults.filter((result) => result.rtt < 0).length / webrtcResults.length,
    candidateTypes: Array.from(allCandidateTypes),
  };
}

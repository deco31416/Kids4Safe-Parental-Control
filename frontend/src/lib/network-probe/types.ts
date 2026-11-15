export interface NetworkMetrics {
  webrtcRttMs: { server: string; rtt: number }[];
  wsRttMs: number;
  httpTtfbMs: number;
  latencyFingerprint: { region: string; minRtt: number; avgRtt: number; jitter: number }[];
  jitterMs: number;
  packetLossEstimate: number;
  webrtcCandidateTypes: string[];
  connectionType?: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
  downlink?: number;
  rtt?: number;
  timezone: string;
  timezoneOffset: number;
  language: string;
  measuredAt: number;
}

export interface STUNServer {
  url: string;
  location: string;
  lat: number;
  lng: number;
}

export type WebRtcProbeResult = {
  server: string;
  rtt: number;
  candidateTypes: string[];
};

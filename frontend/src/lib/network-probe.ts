import { isDesktopDevice } from './network-probe/device';
import {
  getConnectionInfo,
  measureHTTPTTFB,
  measureRegionLatency,
  measureStunServers,
  measureWebSocketRTT,
  summarizeWebrtcResults,
} from './network-probe/measurements';
import type { NetworkMetrics } from './network-probe/types';

export type { NetworkMetrics, STUNServer } from './network-probe/types';
export { isDesktopDevice } from './network-probe/device';

export async function captureNetworkMetrics(backendUrl: string): Promise<NetworkMetrics> {
  console.log('📡 [NetworkProbe] Iniciando captura de métricas...');

  const [webrtcResults, wsRtt, httpTtfb, connectionInfo, latencyFingerprint] = await Promise.all([
    measureStunServers(),
    measureWebSocketRTT(backendUrl.replace('http', 'ws')),
    measureHTTPTTFB(`${backendUrl}/health`),
    Promise.resolve(getConnectionInfo()),
    measureRegionLatency(backendUrl, 'current', 5),
  ]);

  console.log(`  ↳ WebSocket RTT: ${wsRtt.toFixed(0)}ms`);
  console.log(`  ↳ HTTP TTFB: ${httpTtfb.toFixed(0)}ms`);
  console.log(
    `  ↳ Latency Fingerprint (${latencyFingerprint.region}): ` +
    `min=${latencyFingerprint.minRtt.toFixed(0)}ms, ` +
    `avg=${latencyFingerprint.avgRtt.toFixed(0)}ms, ` +
    `jitter=${latencyFingerprint.jitter.toFixed(1)}ms`
  );

  const summary = summarizeWebrtcResults(webrtcResults);
  const metrics: NetworkMetrics = {
    webrtcRttMs: webrtcResults.map((result) => ({ server: result.server, rtt: result.rtt })),
    wsRttMs: wsRtt,
    httpTtfbMs: httpTtfb,
    latencyFingerprint: [latencyFingerprint],
    jitterMs: summary.jitter,
    packetLossEstimate: summary.packetLossEstimate,
    webrtcCandidateTypes: summary.candidateTypes,
    connectionType: connectionInfo.connectionType,
    downlink: connectionInfo.downlink,
    rtt: connectionInfo.rtt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language,
    measuredAt: Date.now(),
  };

  console.log('✅ [NetworkProbe] Métricas capturadas');
  console.log(`  ↳ Candidate types detectados: ${metrics.webrtcCandidateTypes.join(', ') || 'ninguno'}`);
  return metrics;
}

export async function probeNetworkForDesktop(backendUrl: string): Promise<NetworkMetrics | null> {
  if (!isDesktopDevice()) {
    console.log('📱 [NetworkProbe] Dispositivo móvil detectado - saltando probe');
    return null;
  }

  try {
    return await captureNetworkMetrics(backendUrl);
  } catch (error) {
    console.error('❌ [NetworkProbe] Error capturando métricas:', error);
    return null;
  }
}

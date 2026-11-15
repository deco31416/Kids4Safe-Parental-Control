import { useCallback, useEffect, useRef } from 'react';
import { getPublisherJsonHeaders } from '@/lib/publisher-auth';

/**
 * 🔍 P0 #3: WebRTC Connection State Timeline
 * 
 * Objetivo forense:
 * - Diferenciar fallo de red vs desconexión manual
 * - Detectar ICE failures (proxy/firewall/NAT)
 * - Timeline de transiciones para análisis de causa raíz
 * 
 * Estados ICE:
 * - new → checking → connected → completed
 * - failed → usuario detrás de firewall estricto
 * - disconnected → red caída temporalmente
 * - closed → conexión cerrada intencionalmente
 */

export interface WebRTCStateEvent {
  timestamp: number;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
}

type PeerConnectionConstructor = typeof RTCPeerConnection;

interface UseWebRTCMonitorOptions {
  sessionId: string;
  backendUrl: string;
  enabled?: boolean;
  onStateChange?: (event: WebRTCStateEvent) => void;
}

export function useWebRTCMonitor({ 
  sessionId, 
  backendUrl, 
  enabled = true,
  onStateChange 
}: UseWebRTCMonitorOptions) {
  const peerConnectionsRef = useRef<Set<RTCPeerConnection>>(new Set());
  const lastStatesRef = useRef<Map<RTCPeerConnection, WebRTCStateEvent>>(new Map());

  const sendEvent = useCallback(async (pc: RTCPeerConnection, event: WebRTCStateEvent) => {
    // Evitar duplicados
    const lastState = lastStatesRef.current.get(pc);
    if (
      lastState?.connectionState === event.connectionState &&
      lastState?.iceConnectionState === event.iceConnectionState &&
      Date.now() - lastState.timestamp < 500
    ) {
      return;
    }

    lastStatesRef.current.set(pc, event);

    // Callback opcional
    onStateChange?.(event);

    // Enviar al backend
    try {
      await fetch(`${backendUrl}/session/${sessionId}/webrtc-state`, {
        method: 'POST',
        headers: getPublisherJsonHeaders(sessionId),
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Error enviando WebRTC state:', error);
    }
  }, [sessionId, backendUrl, onStateChange]);

  const createEvent = (pc: RTCPeerConnection): WebRTCStateEvent => ({
    timestamp: Date.now(),
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
  });

  const attachListeners = useCallback((pc: RTCPeerConnection) => {
    if (peerConnectionsRef.current.has(pc)) return; // Ya monitoreado

    peerConnectionsRef.current.add(pc);

    const handleStateChange = () => {
      sendEvent(pc, createEvent(pc));
    };

    pc.addEventListener('connectionstatechange', handleStateChange);
    pc.addEventListener('iceconnectionstatechange', handleStateChange);
    pc.addEventListener('icegatheringstatechange', handleStateChange);
    pc.addEventListener('signalingstatechange', handleStateChange);

    // Estado inicial
    sendEvent(pc, createEvent(pc));

    // Cleanup cuando se cierre
    pc.addEventListener('close', () => {
      peerConnectionsRef.current.delete(pc);
      lastStatesRef.current.delete(pc);
    });
  }, [sendEvent]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const peerConnections = peerConnectionsRef.current;
    const lastStates = lastStatesRef.current;

    // Interceptar creación de RTCPeerConnection
    // Esto es necesario porque las conexiones pueden crearse en cualquier momento
    const originalRTCPeerConnection = window.RTCPeerConnection;
    
    const monitoredRTCPeerConnection = function(
      this: RTCPeerConnection,
      ...args: ConstructorParameters<PeerConnectionConstructor>
    ) {
      const pc = new originalRTCPeerConnection(...args);
      attachListeners(pc);
      return pc;
    } as unknown as PeerConnectionConstructor;

    monitoredRTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
    window.RTCPeerConnection = monitoredRTCPeerConnection;

    // Restaurar al desmontar
    return () => {
      window.RTCPeerConnection = originalRTCPeerConnection;
      
      peerConnections.clear();
      lastStates.clear();
    };
  }, [sessionId, enabled, attachListeners]);

  return {
    activeConnections: peerConnectionsRef.current.size,
  };
}

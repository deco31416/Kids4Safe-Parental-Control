import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { loadIceServers } from '@/lib/ice-servers';
import type {
  JoinResponse,
  PublisherState,
} from '@/features/publisher/types/publisher.types';

type UsePublisherRealtimeOptions = {
  join: JoinResponse | null;
  pageState: PublisherState;
  realtimeUrl: string;
  getStreams?: () => MediaStream[];
};

export function usePublisherRealtime({
  join,
  pageState,
  realtimeUrl,
  getStreams,
}: UsePublisherRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const addStreamToPeerConnections = useCallback((stream: MediaStream) => {
    peerConnectionsRef.current.forEach((pc) => {
      if (pc.connectionState === 'closed') return;

      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc.getSenders().some((sender) => sender.track === track);
        if (!alreadyAdded) pc.addTrack(track, stream);
      });
    });
  }, []);

  const closePeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pcRef.current = null;
  }, []);

  const ensurePeerConnection = useCallback(async (viewerSocketId?: string) => {
    if (viewerSocketId) {
      const existing = peerConnectionsRef.current.get(viewerSocketId);
      if (existing && existing.connectionState !== 'closed') {
        pcRef.current = existing;
        return existing;
      }
    } else if (pcRef.current && pcRef.current.connectionState !== 'closed') {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: await loadIceServers({
        sessionId: join?.sessionId,
        publisherToken: join?.publisherToken,
      }),
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const socket = socketRef.current;
      const target = viewerSocketId;
      if (!socket || !target || !join?.sessionId) return;

      socket.emit('webrtc-ice', {
        sessionId: join.sessionId,
        targetSocketId: target,
        candidate: event.candidate,
      });
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 PC state:', pc.connectionState);
    };

    pcRef.current = pc;
    if (viewerSocketId) peerConnectionsRef.current.set(viewerSocketId, pc);
    return pc;
  }, [join]);

  useEffect(() => {
    if (!join?.sessionId || pageState !== 'active') return;

    const socket = io(realtimeUrl, {
      auth: { publisherToken: join.publisherToken, sessionId: join.sessionId },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Conectado a realtime');
      socket.emit('join-session', { sessionId: join.sessionId, role: 'publisher' });
    });

    socket.on('joined', (data) => {
      console.log('✅ Joined room:', data);
    });

    socket.on('webrtc-create-offer', async ({ viewerSocketId }) => {
      try {
        const existingPeer = peerConnectionsRef.current.get(viewerSocketId);
        if (existingPeer) {
          existingPeer.close();
          peerConnectionsRef.current.delete(viewerSocketId);
        }

        const pc = await ensurePeerConnection(viewerSocketId);
        getStreams?.().forEach((stream) => {
          stream.getTracks().forEach((track) => {
            const alreadyAdded = pc.getSenders().some((sender) => sender.track === track);
            if (!alreadyAdded) pc.addTrack(track, stream);
          });
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc-offer', {
          sessionId: join.sessionId,
          viewerSocketId,
          sdp: offer,
        });
      } catch (error) {
        console.error('❌ create-offer error', error);
      }
    });

    socket.on('webrtc-answer', async ({ sdp, from, viewerSocketId }) => {
      try {
        const peerId = from || viewerSocketId;
        const pc = peerId ? peerConnectionsRef.current.get(peerId) : pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(sdp);
      } catch (error) {
        console.error('❌ answer error', error);
      }
    });

    socket.on('webrtc-ice', async ({ candidate, from, viewerSocketId }) => {
      try {
        const peerId = from || viewerSocketId;
        const pc = peerId ? peerConnectionsRef.current.get(peerId) : pcRef.current;
        if (!pc) return;
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('❌ ice error', error);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      closePeerConnections();
    };
  }, [closePeerConnections, ensurePeerConnection, getStreams, join?.publisherToken, join?.sessionId, pageState, realtimeUrl]);

  return {
    socketRef,
    pcRef,
    ensurePeerConnection,
    addStreamToPeerConnections,
    closePeerConnections,
  };
}

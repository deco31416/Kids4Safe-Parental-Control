import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { io, type Socket } from 'socket.io-client';
import { loadIceServers } from '@/lib/ice-servers';

type UseRealtimePublisherOptions = {
  sessionId: string;
  publisherTokenRef: MutableRefObject<string | null>;
  cameraStreamRef: MutableRefObject<MediaStream | null>;
  screenStreamRef: MutableRefObject<MediaStream | null>;
  micStreamRef: MutableRefObject<MediaStream | null>;
  realtimeSocketRef: MutableRefObject<Socket | null>;
  peerConnectionsRef: MutableRefObject<Map<string, RTCPeerConnection>>;
  currentQrIdRef: MutableRefObject<string | null>;
  reloadScreenshotConfig: () => Promise<void>;
  setIsWebRTCReady: Dispatch<SetStateAction<boolean>>;
};

export function useRealtimePublisher({
  sessionId,
  publisherTokenRef,
  cameraStreamRef,
  screenStreamRef,
  micStreamRef,
  realtimeSocketRef,
  peerConnectionsRef,
  currentQrIdRef,
  reloadScreenshotConfig,
  setIsWebRTCReady,
}: UseRealtimePublisherOptions) {
  return useCallback(() => {
    if (!publisherTokenRef.current) {
      console.warn('⚠️ [WebRTC] Publisher token ausente, no se abre socket realtime');
      return;
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
    if (realtimeSocketRef.current) {
      realtimeSocketRef.current.disconnect();
      realtimeSocketRef.current = null;
    }

    const socket = io(`${BACKEND_URL}/realtime`, {
      auth: { publisherToken: publisherTokenRef.current, sessionId },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    realtimeSocketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 [WebRTC] Conectado al servidor realtime');

      socket.emit('join-session', {
        sessionId,
        role: 'publisher',
      });
    });

    socket.on('joined', ({ role }) => {
      console.log(`✅ [WebRTC] Unido como ${role}`);
      setIsWebRTCReady(true);
    });

    socket.on('error', (error) => {
      console.error('❌ [WebRTC] Error del servidor realtime:', error);
    });

    socket.on('webrtc-create-offer', async ({ viewerSocketId }) => {
      console.log(`📤 [WebRTC] Creando offer para viewer ${viewerSocketId}`);

      try {
        const existingPeer = peerConnectionsRef.current.get(viewerSocketId);
        if (existingPeer) {
          existingPeer.close();
          peerConnectionsRef.current.delete(viewerSocketId);
        }

        const pc = new RTCPeerConnection({
          iceServers: await loadIceServers({
            sessionId,
            publisherToken: publisherTokenRef.current,
          }),
        });

        peerConnectionsRef.current.set(viewerSocketId, pc);

        console.log('🎥 [WebRTC] Streams disponibles:', {
          camera: !!cameraStreamRef.current,
          cameraTracks: cameraStreamRef.current?.getTracks().length || 0,
          screen: !!screenStreamRef.current,
          screenTracks: screenStreamRef.current?.getTracks().length || 0,
          mic: !!micStreamRef.current,
          micTracks: micStreamRef.current?.getTracks().length || 0,
        });

        let trackCount = 0;

        const hasCamera = !!cameraStreamRef.current && cameraStreamRef.current.getTracks().length > 0;
        const hasScreen = !!screenStreamRef.current && screenStreamRef.current.getTracks().length > 0;
        const hasMic = !!micStreamRef.current && micStreamRef.current.getTracks().length > 0;

        if (!hasCamera && !hasMic) {
          console.error('❌ [WebRTC] No se pueden crear offer - faltan streams mínimos (cámara o micrófono):', { hasCamera, hasScreen, hasMic });
          return;
        }

        console.log('✅ [WebRTC] Streams validados - creando offer con:', { hasCamera, hasScreen, hasMic });

        if (cameraStreamRef.current) {
          const cameraTracks = cameraStreamRef.current.getTracks();
          console.log(`📹 [WebRTC] Agregando ${cameraTracks.length} tracks de cámara:`, cameraTracks.map(t => t.kind));
          cameraTracks.forEach((track) => {
            pc.addTrack(track, cameraStreamRef.current!);
            trackCount++;
          });
        }

        if (screenStreamRef.current) {
          const screenTracks = screenStreamRef.current.getTracks();
          console.log(`🖥️ [WebRTC] Agregando ${screenTracks.length} tracks de pantalla:`, screenTracks.map(t => t.kind));
          screenTracks.forEach((track) => {
            pc.addTrack(track, screenStreamRef.current!);
            trackCount++;
          });
        }

        if (micStreamRef.current) {
          const micTracks = micStreamRef.current.getTracks();
          console.log(`🎤 [WebRTC] Agregando ${micTracks.length} tracks de micrófono:`, micTracks.map(t => t.kind));
          micTracks.forEach((track) => {
            pc.addTrack(track, micStreamRef.current!);
            trackCount++;
          });
        }

        console.log(`📊 [WebRTC] Total tracks agregados: ${trackCount}`);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice', {
              sessionId,
              targetSocketId: viewerSocketId,
              candidate: event.candidate,
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        console.log('✅ [WebRTC] Offer enviada');

        socket.emit('webrtc-offer', {
          sessionId,
          viewerSocketId,
          sdp: offer,
        });
      } catch (error) {
        console.error('❌ [WebRTC] Error creando offer:', error);
      }
    });

    socket.on('webrtc-answer', async ({ sdp, from }) => {
      console.log(`📥 [WebRTC] Answer recibida de ${from}`);

      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(sdp);
        console.log('✅ [WebRTC] Answer procesada');
      }
    });

    socket.on('webrtc-ice', ({ candidate, from }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        pc.addIceCandidate(candidate);
        console.log(`🧊 [WebRTC] ICE candidate agregado de ${from}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 [WebRTC] Desconectado del servidor');
      setIsWebRTCReady(false);
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    });

    socket.on('screenshot-config-updated', ({ qrId }) => {
      const currentQrId = currentQrIdRef.current;
      if (!qrId || !currentQrId || qrId !== currentQrId) return;
      console.log('⚙️ [Screenshot] Config actualizada, recargando…', { qrId });
      reloadScreenshotConfig();
    });
  }, [
    sessionId,
    publisherTokenRef,
    cameraStreamRef,
    screenStreamRef,
    micStreamRef,
    realtimeSocketRef,
    peerConnectionsRef,
    currentQrIdRef,
    reloadScreenshotConfig,
    setIsWebRTCReady,
  ]);
}

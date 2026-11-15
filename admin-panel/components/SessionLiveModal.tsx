'use client';

import { AlertTriangle, Camera, Info, Loader2, Mic, Monitor, Signal, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SessionStatusPill } from '@/components/sessions/SessionStatusPill';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loadIceServers } from '@/lib/ice-servers';

interface SessionLiveModalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export function SessionLiveModal({ sessionId, open, onClose }: SessionLiveModalProps) {
  // Refs para Socket.IO y WebRTC
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamIdsRef = useRef<{ camera?: string; screen?: string }>({});
  
  // Refs para elementos de video/audio
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Contador para identificar tracks por orden de llegada
  const videoTrackCounterRef = useRef(0);
  
  // Estado
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [publisherAvailable, setPublisherAvailable] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Inicializando...');

  useEffect(() => {
    if (!open || !sessionId) {
      setDebugInfo('Modal cerrado o sin sessionId');
      return; // NO desconectar aquí - dejar que el usuario cierre manualmente
    }

    // ⛔ PREVENIR RECONEXIÓN si ya está conectado
    if (socketRef.current?.connected) {
      console.log('♻️ [SessionLiveModal] Socket ya conectado, reutilizando');
      return;
    }

    setDebugInfo(`Abriendo modal para sesión: ${sessionId}`);

    // Reset contador de videos para nueva conexión
    videoTrackCounterRef.current = 0;

    const initWebRTC = async () => {
      try {
        setConnectionState('connecting');

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
        
        if (!wsUrl) {
          throw new Error('NEXT_PUBLIC_WS_URL o NEXT_PUBLIC_BACKEND_URL no configurado');
        }
        const adminToken = sessionStorage.getItem('auth_token');
        if (!adminToken) {
          throw new Error('Sesion administrativa no autenticada');
        }
        
        console.log('[SessionLiveModal] Conectando a /realtime...', wsUrl);
        setDebugInfo(`Conectando a: ${wsUrl}/realtime`);
        
        const realtimeSocket = io(`${wsUrl}/realtime`, {
          auth: { token: adminToken },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
          forceNew: true,
        });

        socketRef.current = realtimeSocket;
        setDebugInfo(`Socket creado, esperando conexión...`);

        // 2️⃣ SEGUNDO: Handlers Socket.IO (ANTES de unirse)
        realtimeSocket.on('connect', () => {
          console.log('✅ [SessionLiveModal] Conectado a /realtime');
          console.log('✅ Socket ID:', realtimeSocket?.id);
          setConnectionState('connecting'); // Sigue connecting hasta tener publisher
          setDebugInfo(` Conectado! Socket ID: ${realtimeSocket?.id}`);
          
          // 3️⃣ TERCERO: Unirse como viewer
          realtimeSocket!.emit('join-session', {
            sessionId: sessionId,
            role: 'viewer',
            username: 'Admin',
          });
        });

        realtimeSocket.on('joined', ({ role }: { role: string }) => {
          console.log(`✅ [SessionLiveModal] Unido como ${role}`);
        });

        realtimeSocket.on('publisher-ready', () => {
          console.log('✅ [SessionLiveModal] Publisher disponible, solicitando stream...');
          setPublisherAvailable(true);
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          
          // 4️⃣ CUARTO: Solicitar al publisher que cree offer
          realtimeSocket!.emit('webrtc-start', { sessionId: sessionId });
        });

        realtimeSocket.on('publisher-disconnected', () => {
          console.warn('⚠️ [SessionLiveModal] Publisher desconectado');
          setPublisherAvailable(false);
          setConnectionState('failed');
        });

        realtimeSocket.on('session-ended', ({ reason }: { reason?: string }) => {
          setPublisherAvailable(false);
          setConnectionState('disconnected');
          setDebugInfo(reason === 'mobile_session_replaced' ? 'Sesion reemplazada por una nueva emergencia' : 'Sesion finalizada');
          peerConnectionRef.current?.close();
          peerConnectionRef.current = null;
        });

        realtimeSocket.on('webrtc-offer', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
          console.log('📥 [SessionLiveModal] Offer recibida del publisher');
          await handleOffer(sdp, from, realtimeSocket!);
        });

        realtimeSocket.on('webrtc-ice', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!candidate) return;
          const peerConnection = peerConnectionRef.current;
          if (!peerConnection?.remoteDescription) {
            pendingIceCandidatesRef.current.push(candidate);
            return;
          }
          if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('🧊 [SessionLiveModal] ICE candidate agregado');
          }
        });

        realtimeSocket.on('tracks-update', ({ tracks }: {
          tracks: { cameraStreamId?: string; screenStreamId?: string };
        }) => {
          streamIdsRef.current = {
            camera: tracks.cameraStreamId,
            screen: tracks.screenStreamId,
          };
        });

        realtimeSocket.on('error', (error: any) => {
          console.error('❌ [SessionLiveModal] Error:', error);
          setConnectionState('failed');
        });

        realtimeSocket.on('connect_error', (error: any) => {
          console.error('❌ [SessionLiveModal] Error de conexión:', error.message);
          setConnectionState('failed');
          setDebugInfo(` Error: ${error.message}`);
        });

        realtimeSocket.on('disconnect', (reason: string) => {
          console.warn('⚠️ [SessionLiveModal] Desconectado:', reason);
          setConnectionState('disconnected');
          setDebugInfo(` Desconectado: ${reason}`);
        });

        realtimeSocket.on('reconnect', (attemptNumber: number) => {
          console.log(`🔄 [SessionLiveModal] Reconectado después de ${attemptNumber} intentos`);
          setConnectionState('connecting');
        });

        realtimeSocket.on('reconnect_attempt', (attemptNumber: number) => {
          console.log(`🔄 [SessionLiveModal] Intento de reconexión ${attemptNumber}...`);
        });

        realtimeSocket.on('reconnect_error', (error: any) => {
          console.error('❌ [SessionLiveModal] Error en reconexión:', error.message);
        });

        realtimeSocket.on('reconnect_failed', () => {
          console.error('❌ [SessionLiveModal] Falló la reconexión después de todos los intentos');
          setConnectionState('failed');
        });

      } catch (err) {
        console.error('❌ [SessionLiveModal] Error inicializando:', err);
        setConnectionState('failed');
      }
    };

    const handleOffer = async (sdp: RTCSessionDescriptionInit, publisherSocketId: string, socket: Socket) => {
      try {
        console.log('🔧 [SessionLiveModal] Creando PeerConnection...');
        
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        videoTrackCounterRef.current = 0;

        const peerConnection = new RTCPeerConnection({
          iceServers: await loadIceServers({
            sessionId,
            adminToken: sessionStorage.getItem('auth_token'),
          }),
        });

        peerConnectionRef.current = peerConnection;

        // 5️⃣ QUINTO: Handlers WebRTC
        peerConnection.ontrack = (event) => {
          console.log(`🎥 [SessionLiveModal] Track recibido: ${event.track.kind} - Label: "${event.track.label}" - ID: ${event.track.id}`);
          
          const stream = event.streams[0];
          const streamId = stream?.id;
          const isCameraStream = Boolean(streamId && streamIdsRef.current.camera === streamId);
          const isScreenStream = Boolean(streamId && streamIdsRef.current.screen === streamId);
          
          if (event.track.kind === 'video') {
            setHasVideo(true);
            
            // ⚠️ CRÍTICO: Identificar por ORDEN de llegada
            // Primer video = cámara, Segundo video = pantalla
            videoTrackCounterRef.current++;
            
            if (isCameraStream || (!isScreenStream && videoTrackCounterRef.current === 1)) {
              console.log('📷 [SessionLiveModal] Primer video → Cámara');
              if (cameraVideoRef.current) {
                console.log('✅ [SessionLiveModal] Element cameraVideoRef existe');
                cameraVideoRef.current.srcObject = new MediaStream([event.track]);
                cameraVideoRef.current.play().catch(err => {
                  console.warn('⚠️ [SessionLiveModal] Error iniciando video cámara:', err.message);
                });
                console.log('✅ [SessionLiveModal] Stream de cámara asignado');
              } else {
                console.error('❌ [SessionLiveModal] cameraVideoRef.current es NULL');
              }
            } else if (isScreenStream || videoTrackCounterRef.current === 2) {
              console.log('📺 [SessionLiveModal] Segundo video → Pantalla');
              if (screenVideoRef.current) {
                console.log('✅ [SessionLiveModal] Element screenVideoRef existe');
                screenVideoRef.current.srcObject = new MediaStream([event.track]);
                screenVideoRef.current.play().catch(err => {
                  console.warn('⚠️ [SessionLiveModal] Error iniciando video pantalla:', err.message);
                });
                console.log('✅ [SessionLiveModal] Stream de pantalla asignado');
              } else {
                console.error('❌ [SessionLiveModal] screenVideoRef.current es NULL');
              }
            }
          } else if (event.track.kind === 'audio') {
            setHasAudio(true);
            console.log('🔊 [SessionLiveModal] Audio track detectado');
            if (audioRef.current) {
              audioRef.current.srcObject = new MediaStream([event.track]);
              // Forzar reproducción automática
              audioRef.current.play().catch(err => {
                console.warn('⚠️ [SessionLiveModal] Error iniciando audio:', err.message);
              });
              console.log('✅ [SessionLiveModal] Stream de audio asignado');
            }
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice', {
              sessionId: sessionId,
              targetSocketId: publisherSocketId,
              candidate: event.candidate,
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(`🔗 [SessionLiveModal] Estado: ${peerConnection!.connectionState}`);
          
          if (peerConnection!.connectionState === 'connected') {
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
            }
            setConnectionState('connected');
          } else if (peerConnection!.connectionState === 'failed' || peerConnection!.connectionState === 'disconnected') {
            setConnectionState('connecting');
            if (!reconnectTimerRef.current) {
              reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                peerConnectionRef.current?.close();
                peerConnectionRef.current = null;
                socket.emit('webrtc-start', { sessionId });
              }, 2000);
            }
          }
        };

        // 6️⃣ SEXTO: Procesar offer y crear answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        console.log('📥 [SessionLiveModal] Remote description seteada');

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('📤 [SessionLiveModal] Answer creada');

        socket.emit('webrtc-answer', {
          sessionId: sessionId,
          publisherSocketId,
          sdp: answer,
        });

        console.log('✅ [SessionLiveModal] Answer enviada al publisher');
      } catch (err) {
        console.error('❌ [SessionLiveModal] Error manejando offer:', err);
        setConnectionState('failed');
      }
    };

    initWebRTC();

    // 🚨 FASE 2: Cleanup INCONDICIONAL - siempre cierra recursos
    return () => {
      console.log('🧹 [SessionLiveModal] Cleanup ejecutado - cerrando conexiones');
      
      // Cerrar PeerConnection
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      pendingIceCandidatesRef.current = [];
      streamIdsRef.current = {};

      if (peerConnectionRef.current) {
        console.log('🔒 [SessionLiveModal] Cerrando PeerConnection');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Cerrar Socket
      if (socketRef.current) {
        console.log('🔒 [SessionLiveModal] Desconectando Socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Detener media tracks
      if (cameraVideoRef.current?.srcObject) {
        const stream = cameraVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        cameraVideoRef.current.srcObject = null;
      }
      if (screenVideoRef.current?.srcObject) {
        const stream = screenVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        screenVideoRef.current.srcObject = null;
      }
      if (audioRef.current?.srcObject) {
        const stream = audioRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        audioRef.current.srcObject = null;
      }
    };
  }, [open, sessionId]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleClose = () => {
    console.log('🚪 [SessionLiveModal] Usuario cerrando modal');
    
    // Reset contador de videos
    videoTrackCounterRef.current = 0;
    
    // Reset estados (el cleanup de useEffect ya cerró las conexiones)
    setConnectionState('disconnected');
    setHasVideo(false);
    setHasAudio(false);
    setPublisherAvailable(false);
    
    // Llamar al onClose del padre
    onClose();
  };

  const getConnectionBadge = () => {
    if (connectionState === 'connecting') return <SessionStatusPill tone="blue" icon={<Loader2 className="animate-spin" />}>Conectando</SessionStatusPill>;
    if (connectionState === 'connected') return <SessionStatusPill tone="teal" icon={<Signal />}>En vivo</SessionStatusPill>;
    if (connectionState === 'failed') return <SessionStatusPill tone="amber" icon={<AlertTriangle />}>Sin transmisión</SessionStatusPill>;
    return <SessionStatusPill>Sin conexión</SessionStatusPill>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="kids-session-dialog kids-live-dialog max-w-6xl qr-dialog-scroll border-border bg-white text-foreground">
        <DialogHeader className="kids-session-modal-heading text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Monitor className="h-5 w-5 shrink-0 text-primary" />
                Monitor en vivo
              </DialogTitle>
              <DialogDescription className="text-sm text-foreground/60 mt-1">
                Medios compartidos · Sesión {sessionId.slice(0, 8)}…
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getConnectionBadge()}
              {hasVideo && <SessionStatusPill tone="blue" icon={<Camera />}>Vídeo</SessionStatusPill>}
              {hasAudio && <SessionStatusPill tone="blue" icon={<Mic />}>Audio</SessionStatusPill>}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado de conexión */}
          {connectionState === 'connecting' && (
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Loader2 className="h-4 w-4 text-blue-700 animate-spin" />
              <AlertDescription className="text-blue-700 ml-2">
                Estableciendo conexión WebRTC con el usuario...
              </AlertDescription>
            </Alert>
          )}

          {connectionState === 'failed' && !publisherAvailable && (
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <Info className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-700 ml-2">
                El usuario no está transmitiendo actualmente. Esperando conexión...
              </AlertDescription>
            </Alert>
          )}

          {connectionState === 'failed' && publisherAvailable && (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <AlertDescription className="text-red-700 ml-2">
                Error en la conexión WebRTC. Intenta reabrir el monitor.
              </AlertDescription>
            </Alert>
          )}

          {/* Sección de videos - SIEMPRE renderizados para que refs existan */}
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Video de cámara */}
            <div className="kids-live-media relative overflow-hidden rounded-2xl border border-border bg-[#0B1730]" style={{ aspectRatio: '16/9' }}>
              <div className="absolute top-2 left-2 z-10">
                <SessionStatusPill className="kids-media-label" icon={<Camera />}>Cámara</SessionStatusPill>
              </div>
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full h-full object-contain"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>

            {/* Video de pantalla compartida */}
            <div className="kids-live-media relative overflow-hidden rounded-2xl border border-border bg-[#0B1730]" style={{ aspectRatio: '16/9' }}>
              <div className="absolute top-2 left-2 z-10">
                <SessionStatusPill className="kids-media-label" icon={<Monitor />}>Pantalla</SessionStatusPill>
              </div>
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Audio (oculto pero reproduciendo) */}
            <audio
              ref={audioRef}
              autoPlay
              muted={isMuted}
              style={{ display: 'none' }}
            />
          </div>

          {connectionState !== 'connected' && (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-5">
              <div className="text-center text-foreground/60 space-y-2">
                  {connectionState === 'connecting' && (
                    <>
                      <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500" />
                      <p className="text-sm">Conectando a la sesión...</p>
                    </>
                  )}
                  {connectionState === 'failed' && (
                    <>
                      <Monitor className="h-12 w-12 mx-auto opacity-50" />
                      <p className="text-sm">Sin transmisión activa</p>
                    </>
                  )}
                </div>
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={toggleMute}
                variant="outline"
                disabled={connectionState !== 'connected' || !hasAudio}
                aria-pressed={connectionState === 'connected' && hasAudio && !isMuted}
                aria-label={isMuted ? 'Activar audio de la sesión' : 'Silenciar audio de la sesión'}
                data-state={connectionState !== 'connected' || !hasAudio ? 'unavailable' : isMuted ? 'muted' : 'playing'}
                className="kids-live-audio"
              >
                <span className="kids-live-audio-icon" aria-hidden="true">{isMuted ? <VolumeX /> : <Volume2 />}</span>
                <span>{connectionState !== 'connected' || !hasAudio ? 'Audio no disponible' : isMuted ? 'Audio silenciado' : 'Audio activo'}</span>
                {connectionState === 'connected' && hasAudio && !isMuted && <span className="kids-live-audio-indicator" aria-hidden="true" />}
              </Button>
            </div>

            <Button
              onClick={handleClose}
              variant="outline"
              className="border-border bg-card px-5 text-foreground hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-700"
            >
              Cerrar
            </Button>
          </div>

          <details className="min-w-0 rounded-xl border border-border bg-muted/30 p-3 text-xs"><summary className="cursor-pointer font-medium text-muted-foreground">Detalles de conexión</summary><div className="mt-3 space-y-2 leading-relaxed text-muted-foreground"><p className="break-all font-mono">{debugInfo}</p><p className="break-all font-mono">Sesión: {sessionId}</p><p>La transmisión utiliza WebRTC. Los medios dependen de los permisos y del estado del dispositivo.</p></div></details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

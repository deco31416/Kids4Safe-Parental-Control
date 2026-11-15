"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  AlertCircle,
  Loader2,
  Video,
  Mic,
  MonitorUp,
  XCircle,
} from "lucide-react";
import { loadIceServers } from "@/lib/ice-servers";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:7000/realtime";

export default function AdminLiveViewer({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [connected, setConnected] = useState(false);
  const [publisherOnline, setPublisherOnline] = useState(false);
  const [publisherSocketId, setPublisherSocketId] = useState<string | null>(null);

  const [tracks, setTracks] = useState({
    camera: false,
    mic: false,
    screen: false,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      setError("Sesion administrativa no autenticada");
      return;
    }

    const socket = io(REALTIME_URL, {
      auth: { token },
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-session", { sessionId, role: "viewer", username: "Admin" });
    });

    socket.on("joined", (data) => {
      console.log("👁️ Joined as viewer:", data);
    });

    socket.on("publisher-ready", () => {
      console.log("📡 Publisher online");
      setPublisherOnline(true);
      // Auto-iniciar negociación
      socket.emit("webrtc-start", { sessionId });
    });

    socket.on("publisher-disconnected", () => {
      console.log("📡 Publisher offline");
      setPublisherOnline(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
    });

    socket.on("session-ended", () => {
      setPublisherOnline(false);
      setError("La sesion fue finalizada o reemplazada");
      if (videoRef.current) videoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;
    });

    socket.on("webrtc-offer", async ({ sdp, from }) => {
      setPublisherSocketId(from);

      try {
        const pc = await ensurePC();
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          sessionId,
          publisherSocketId: from,
          sdp: answer,
        });
      } catch (err) {
        console.error("❌ webrtc-offer error", err);
        setError("Error al procesar offer");
      }
    });

    socket.on("webrtc-ice", async ({ candidate }) => {
      try {
        const pc = await ensurePC();
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("❌ ice error", err);
      }
    });

    socket.on("tracks-update", ({ tracks: updatedTracks }) => {
      console.log("🎬 Tracks actualizados:", updatedTracks);
      setTracks(updatedTracks);
    });

    socket.on("error", (data) => {
      console.error("❌ Socket error:", data);
      setError(data.message || "Error desconocido");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function ensurePC() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: await loadIceServers({
        sessionId,
        adminToken: sessionStorage.getItem('auth_token'),
      }),
    });

    pc.ontrack = (e) => {
      console.log("🎥 Track recibido:", e.track.kind);
      if (!videoRef.current) return;

      // Agregar el stream al video element
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.addTrack(e.track);
      } else {
        videoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const socket = socketRef.current;
      if (!socket || !publisherSocketId) return;

      socket.emit("webrtc-ice", {
        sessionId,
        targetSocketId: publisherSocketId,
        candidate: e.candidate,
      });
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 PC state:", pc.connectionState);
      if (pc.connectionState === "failed") {
        setError("Conexión WebRTC fallida");
      }
    };

    pcRef.current = pc;
    return pc;
  }

  function reconnect() {
    if (socketRef.current) {
      socketRef.current.emit("webrtc-start", { sessionId });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Live Viewer</h1>
        <p className="text-sm text-muted-foreground">Sesión: {sessionId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Video principal */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Stream en vivo</CardTitle>
              <div className="flex items-center gap-2">
                {connected ? (
                  <Badge variant="default">
                    <div className="h-2 w-2 bg-green-600 rounded-full mr-1.5 animate-pulse" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Conectando...
                  </Badge>
                )}

                {publisherOnline ? (
                  <Badge variant="default">Publisher online</Badge>
                ) : (
                  <Badge variant="secondary">Publisher offline</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                controls
                className="w-full rounded-md bg-background aspect-video"
              />
              {!publisherOnline && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-md">
                  <div className="text-center text-foreground">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Esperando publisher...</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reconnect}>
                  <Play className="mr-2 h-4 w-4" />
                  Reconectar
                </Button>
              </div>

              <div className="flex gap-2">
                <Badge variant={tracks.camera ? "default" : "secondary"}>
                  <Video className="mr-1 h-3 w-3" />
                  Cámara
                </Badge>
                <Badge variant={tracks.mic ? "default" : "secondary"}>
                  <Mic className="mr-1 h-3 w-3" />
                  Mic
                </Badge>
                <Badge variant={tracks.screen ? "default" : "secondary"}>
                  <MonitorUp className="mr-1 h-3 w-3" />
                  Pantalla
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info lateral */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Session ID</p>
              <p className="font-mono text-xs break-all">{sessionId}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Estado conexión</p>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Publisher</p>
              <Badge variant={publisherOnline ? "default" : "secondary"}>
                {publisherOnline ? "Online" : "Offline"}
              </Badge>
            </div>

            <div className="border-t pt-3">
              <p className="text-muted-foreground text-xs mb-2">Acciones</p>
              <Button variant="destructive" size="sm" className="w-full">
                <XCircle className="mr-2 h-4 w-4" />
                Terminar y eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

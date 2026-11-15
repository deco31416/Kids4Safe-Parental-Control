"use client";

/**
 * Stream Publisher Page (Refactored)
 * Orchestrator: Solo lógica de negocio, WebRTC, Socket.io
 * UI delegada a feature components
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

import { ConsentPrompt } from "@/features/publisher/components/ConsentPrompt";
import { StreamStatus } from "@/features/publisher/components/StreamStatus";
import { StreamPublisher } from "@/features/publisher/components/StreamPublisher";
import { usePublisherHeartbeat } from "@/features/publisher/hooks/usePublisherHeartbeat";
import { usePublisherJoin } from "@/features/publisher/hooks/usePublisherJoin";
import { usePublisherRealtime } from "@/features/publisher/hooks/usePublisherRealtime";

import type { StreamState } from "@/features/publisher/types/publisher.types";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7000";
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:7000/realtime";

export default function LivePage() {
  const params = useParams<{ qrId: string }>();
  const qrId = params.qrId;

  const {
    pageState,
    setPageState,
    join,
    error,
    setError,
  } = usePublisherJoin({ qrId, apiBase: API_BASE });

  const [streamState, setStreamState] = useState<StreamState>({
    camera: false,
    mic: false,
    screen: false,
    location: false,
  });
  const streamStateRef = useRef<StreamState>(streamState);

  // Refs
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const publisherToken = join?.publisherToken;

  const publisherHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(publisherToken ? { "X-Publisher-Session-Token": publisherToken } : {}),
  }), [publisherToken]);

  const getActiveStreams = useCallback(() => {
    return [cameraStreamRef.current, screenStreamRef.current].filter(Boolean) as MediaStream[];
  }, []);

  const { socketRef, addStreamToPeerConnections, closePeerConnections } = usePublisherRealtime({
    join,
    pageState,
    realtimeUrl: REALTIME_URL,
    getStreams: getActiveStreams,
  });

  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

  usePublisherHeartbeat({
    apiBase: API_BASE,
    join,
    pageState,
    streamState,
    publisherHeaders,
  });

  // =========================================
  // HANDLERS
  // =========================================

  async function startCameraMic() {
    if (cameraStreamRef.current) {
      console.log("📹 Cámara/mic ya activos, evitando tracks duplicados");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      cameraStreamRef.current = stream;
      setStreamState((prev) => ({ ...prev, camera: true, mic: true }));

      addStreamToPeerConnections(stream);

      notifyTracksUpdate({ camera: true, mic: true });
    } catch (e) {
      console.error(e);
      setError("No se pudo activar cámara/mic");
    }
  }

  async function startScreenShare() {
    if (screenStreamRef.current) {
      console.log("🖥️ Pantalla ya compartida, evitando tracks duplicados");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      setStreamState((prev) => ({ ...prev, screen: true }));

      addStreamToPeerConnections(stream);

      notifyTracksUpdate({ screen: true });

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        screenStreamRef.current = null;
        setStreamState((prev) => ({ ...prev, screen: false }));
        notifyTracksUpdate({ screen: false });
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo compartir pantalla");
    }
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      setError("Geolocalización no disponible");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setStreamState((prev) => ({ ...prev, location: true }));

        fetch(`${API_BASE}/session/${join!.sessionId}/location`, {
          method: "POST",
          headers: publisherHeaders(),
          body: JSON.stringify({ latitude, longitude, accuracy }),
        }).catch(() => {});
      },
      (err) => {
        console.error(err);
        setError("No se pudo obtener ubicación");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function notifyTracksUpdate(partial: Partial<StreamState>) {
    if (!socketRef.current || !join?.sessionId) return;

    const merged = { ...streamStateRef.current, ...partial };

    socketRef.current.emit("tracks-update", {
      sessionId: join.sessionId,
      tracks: {
        camera: merged.camera,
        mic: merged.mic,
        screen: merged.screen,
      },
    });
  }

  async function stopAll() {
    try {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      screenStreamRef.current = null;

      closePeerConnections();

      setStreamState({ camera: false, mic: false, screen: false, location: false });

      if (join?.sessionId) {
        fetch(`${API_BASE}/session/${join.sessionId}/end`, {
          method: "POST",
          headers: publisherHeaders(),
        }).catch(() => {});
      }
    } catch {}
  }

  function openDestination() {
    if (!join?.destinationUrl) return;
    window.open(join.destinationUrl, "_blank", "noopener,noreferrer");

    fetch(`${API_BASE}/session/${join.sessionId}/content-redirect`, {
      method: "POST",
      headers: publisherHeaders(),
      body: JSON.stringify({
        redirectedAt: Date.now(),
        contentUrl: join.destinationUrl,
      }),
    }).catch(() => {});
  }

  function handleAcceptConsent() {
    setPageState('active');
  }

  // =========================================
  // RENDER
  // =========================================

  // Loading
  if (pageState === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium">Inicializando sesión...</span>
        </div>
      </div>
    );
  }

  // Error
  if (pageState === 'error' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-background">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-sm">
              {error || "Error desconocido"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Consent
  if (pageState === 'consent-required' && join) {
    return <ConsentPrompt session={join} onAccept={handleAcceptConsent} />;
  }

  // Active
  if (pageState === 'active' && join) {
    return (
      <div className="min-h-screen p-4 md:p-6 bg-neutral-50 dark:bg-background">
        <div className="max-w-3xl mx-auto space-y-6">
          <StreamStatus streamState={streamState} qrName={join.qrName} />

          <StreamPublisher
            streamState={streamState}
            destinationUrl={join.destinationUrl}
            onStartCamera={startCameraMic}
            onStartScreen={startScreenShare}
            onRequestLocation={requestLocation}
            onOpenDestination={openDestination}
            onStopAll={stopAll}
            sessionId={join.sessionId}
          />
        </div>
      </div>
    );
  }

  return null;
}

import { Platform } from "react-native";
import { io, type Socket } from "socket.io-client";
import { REALTIME_URL } from "../config/apiUrl";
import { getIceServers } from "../config/iceServers";
import { sessionApi } from "../api/session.api";

const CAMERA_EVIDENCE_INTERVAL_MS = 15000;

type TrackState = {
  camera: boolean;
  cameraStreamId?: string;
  mic: boolean;
  screen: boolean;
  screenStreamId?: string;
};

type ActivePublisher = {
  cameraStream?: MediaStream;
  cameraEvidenceTimer?: ReturnType<typeof setInterval>;
  cameraEvidenceCapturing?: boolean;
  onSessionEnded?: () => void;
  onTracksChanged?: (tracks: TrackState) => void;
  pendingIceCandidates: Map<string, RTCIceCandidateInit[]>;
  peerConnections: Map<string, RTCPeerConnection>;
  screenStream?: MediaStream;
  mobileSessionToken?: string;
  sessionId: string;
  socket: Socket;
  tracks: TrackState;
};

let activePublisher: ActivePublisher | null = null;
let preparedScreenStream: MediaStream | null = null;

function isWebMediaSupported() {
  return Platform.OS === "web" && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

function emitTracks(sessionId: string) {
  if (!activePublisher) return;
  activePublisher.onTracksChanged?.(activePublisher.tracks);
  activePublisher.socket.emit("tracks-update", {
    sessionId,
    tracks: activePublisher.tracks
  });
}

function addStreamToPeer(pc: RTCPeerConnection, stream?: MediaStream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    const exists = pc.getSenders().some((sender) => sender.track === track);
    if (!exists) {
      pc.addTrack(track, stream);
    }
  }
}

async function captureCameraEvidenceFrame() {
  if (!activePublisher?.cameraStream || activePublisher.cameraEvidenceCapturing) return;
  if (typeof document === "undefined") return;

  const videoTrack = activePublisher.cameraStream.getVideoTracks()[0];
  if (!videoTrack || videoTrack.readyState !== "live" || !videoTrack.enabled) return;

  activePublisher.cameraEvidenceCapturing = true;
  const video = document.createElement("video");
  try {
    video.muted = true;
    video.playsInline = true;
    video.srcObject = activePublisher.cameraStream;
    await video.play();

    await new Promise<void>((resolve) => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
      }
      video.onloadedmetadata = () => resolve();
      setTimeout(resolve, 1500);
    });

    const width = Math.max(1, Math.min(video.videoWidth || 640, 960));
    const height = Math.max(1, Math.round((video.videoHeight || 480) * (width / (video.videoWidth || 640))));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.72);
    await sessionApi.mobileCameraCapture(
      activePublisher.sessionId,
      imageDataUrl,
      activePublisher.mobileSessionToken,
    );
  } catch (error) {
    console.warn("[mobileRealtimePublisher] No se pudo guardar evidencia de camara", error);
  } finally {
    video.pause();
    video.srcObject = null;
    if (activePublisher) activePublisher.cameraEvidenceCapturing = false;
  }
}

function startCameraEvidenceCapture() {
  if (!activePublisher?.cameraStream || activePublisher.cameraEvidenceTimer) return;
  if (!activePublisher.cameraStream.getVideoTracks().some((track) => track.enabled && track.readyState === "live")) return;

  setTimeout(() => void captureCameraEvidenceFrame(), 1500);
  activePublisher.cameraEvidenceTimer = setInterval(() => {
    void captureCameraEvidenceFrame();
  }, CAMERA_EVIDENCE_INTERVAL_MS);
}

function stopCameraEvidenceCapture() {
  if (!activePublisher?.cameraEvidenceTimer) return;
  clearInterval(activePublisher.cameraEvidenceTimer);
  activePublisher.cameraEvidenceTimer = undefined;
  activePublisher.cameraEvidenceCapturing = false;
}

async function createPeerConnection(sessionId: string, viewerSocketId: string) {
  if (!activePublisher) throw new Error("Publisher no iniciado");

  const existing = activePublisher.peerConnections.get(viewerSocketId);
  if (existing && existing.connectionState !== "failed" && existing.connectionState !== "closed") return existing;
  existing?.close();

  const pc = new RTCPeerConnection({
    iceServers: await getIceServers({
      sessionId,
      mobileSessionToken: activePublisher.mobileSessionToken,
    }),
  });
  addStreamToPeer(pc, activePublisher.cameraStream);
  addStreamToPeer(pc, activePublisher.screenStream);

  pc.onicecandidate = (event) => {
    if (!event.candidate || !activePublisher) return;
    activePublisher.socket.emit("webrtc-ice", {
      sessionId,
      targetSocketId: viewerSocketId,
      candidate: event.candidate
    });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      activePublisher?.peerConnections.delete(viewerSocketId);
      activePublisher?.pendingIceCandidates.delete(viewerSocketId);
    }
  };

  activePublisher.peerConnections.set(viewerSocketId, pc);
  return pc;
}

async function sendOffer(sessionId: string, viewerSocketId: string) {
  if (!activePublisher) return;
  const pc = await createPeerConnection(sessionId, viewerSocketId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  activePublisher.socket.emit("webrtc-offer", {
    sessionId,
    viewerSocketId,
    sdp: offer
  });
}

async function startCameraMic(sessionId: string, options?: { camera?: boolean; microphone?: boolean }) {
  if (!activePublisher || activePublisher.cameraStream) return;
  const wantsCamera = options?.camera !== false;
  const wantsMicrophone = options?.microphone !== false;
  if (!wantsCamera && !wantsMicrophone) return;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: wantsMicrophone,
    video: wantsCamera
      ? {
          facingMode: "user"
        }
      : false
  });

  activePublisher.cameraStream = stream;
  activePublisher.tracks = {
    ...activePublisher.tracks,
    camera: stream.getVideoTracks().some((track) => track.enabled),
    cameraStreamId: stream.id,
    mic: stream.getAudioTracks().some((track) => track.enabled)
  };

  for (const pc of activePublisher.peerConnections.values()) {
    addStreamToPeer(pc, stream);
  }

  emitTracks(sessionId);
  startCameraEvidenceCapture();
}

async function startScreenShare(sessionId: string) {
  if (!activePublisher || activePublisher.screenStream) return;

  try {
    const stream = preparedScreenStream || await requestDisplayMedia();
    preparedScreenStream = null;

    activePublisher.screenStream = stream;
    activePublisher.tracks = {
      ...activePublisher.tracks,
      screen: stream.getVideoTracks().some((track) => track.enabled),
      screenStreamId: stream.id
    };

    for (const pc of activePublisher.peerConnections.values()) {
      addStreamToPeer(pc, stream);
    }

    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (!activePublisher) return;
      activePublisher.screenStream = undefined;
      activePublisher.tracks = {
        ...activePublisher.tracks,
        screen: false,
        screenStreamId: undefined
      };
      emitTracks(sessionId);
    });

    emitTracks(sessionId);
    for (const viewerSocketId of activePublisher.peerConnections.keys()) {
      void sendOffer(sessionId, viewerSocketId);
    }
  } catch (error) {
    console.warn("[mobileRealtimePublisher] Pantalla no compartida", error);
  }
}

async function requestDisplayMedia() {
  if (!isWebMediaSupported()) throw new Error("Captura de pantalla web no disponible");
  const getDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
  if (!getDisplayMedia) throw new Error("El navegador no permite compartir pantalla");

  return getDisplayMedia({
    audio: false,
    video: true
  });
}

function stopScreenStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function waitForJoined(socket: Socket, timeoutMs = 8000) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (joined: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("joined", onJoined);
      socket.off("connect_error", onError);
      socket.off("error", onError);
      resolve(joined);
    };
    const onJoined = () => finish(true);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);

    socket.once("joined", onJoined);
    socket.once("connect_error", onError);
    socket.once("error", onError);
  });
}

export const mobileRealtimePublisherService = {
  isScreenShareAvailable() {
    return isWebMediaSupported() && Boolean(navigator.mediaDevices.getDisplayMedia);
  },

  isScreenSharePrepared() {
    return Boolean(preparedScreenStream?.getVideoTracks().some((track) => track.readyState === "live"));
  },

  async prepareScreenShare() {
    if (!isWebMediaSupported()) return false;
    if (this.isScreenSharePrepared() || activePublisher?.tracks.screen) return true;

    const stream = await requestDisplayMedia();
    preparedScreenStream = stream;
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (preparedScreenStream === stream) preparedScreenStream = null;
    });
    if (activePublisher) {
      await startScreenShare(activePublisher.sessionId);
    }
    return true;
  },

  stopScreenShare() {
    stopScreenStream(preparedScreenStream);
    preparedScreenStream = null;

    if (!activePublisher?.screenStream) return;
    stopScreenStream(activePublisher.screenStream);
    activePublisher.screenStream = undefined;
    activePublisher.tracks = {
      ...activePublisher.tracks,
      screen: false,
      screenStreamId: undefined
    };
    emitTracks(activePublisher.sessionId);
  },

  async start(sessionId: string, options?: {
    camera?: boolean;
    mobileSessionToken?: string;
    onSessionEnded?: () => void;
    microphone?: boolean;
    onTracksChanged?: (tracks: TrackState) => void;
    screen?: boolean;
  }) {
    if (!isWebMediaSupported()) return false;
    if (activePublisher?.sessionId === sessionId) return true;
    if (activePublisher) this.stop();

    const socket = io(REALTIME_URL, {
      auth: { mobileSessionToken: options?.mobileSessionToken, sessionId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 12000
    });

    activePublisher = {
      onSessionEnded: options?.onSessionEnded,
      onTracksChanged: options?.onTracksChanged,
      pendingIceCandidates: new Map(),
      peerConnections: new Map(),
      mobileSessionToken: options?.mobileSessionToken,
      sessionId,
      socket,
      tracks: { camera: false, mic: false, screen: false }
    };

    socket.on("connect", () => {
      socket.emit("join-session", { sessionId, role: "publisher" });
    });

    socket.on("joined", () => {
      emitTracks(sessionId);
    });

    socket.on("disconnect", (reason) => {
      console.warn("[mobileRealtimePublisher] Socket desconectado", reason);
    });

    socket.on("session-ended", ({ sessionId: endedSessionId }: { sessionId: string }) => {
      if (endedSessionId !== sessionId) return;
      activePublisher?.onSessionEnded?.();
    });

    socket.on("connect_error", (error) => {
      console.warn("[mobileRealtimePublisher] Error de conexion realtime", error.message);
    });

    socket.on("webrtc-create-offer", async ({ viewerSocketId }: { viewerSocketId: string }) => {
      try {
        await sendOffer(sessionId, viewerSocketId);
      } catch (error) {
        console.warn("[mobileRealtimePublisher] No se pudo crear offer", error);
      }
    });

    socket.on("webrtc-answer", async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
      try {
        const pc = await createPeerConnection(sessionId, from);
        await pc.setRemoteDescription(sdp);
        const pendingCandidates = activePublisher?.pendingIceCandidates.get(from) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        activePublisher?.pendingIceCandidates.delete(from);
      } catch (error) {
        console.warn("[mobileRealtimePublisher] No se pudo aplicar answer", error);
      }
    });

    socket.on("webrtc-ice", async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      try {
        const pc = await createPeerConnection(sessionId, from);
        if (!pc.remoteDescription) {
          const pendingCandidates = activePublisher?.pendingIceCandidates.get(from) || [];
          pendingCandidates.push(candidate);
          activePublisher?.pendingIceCandidates.set(from, pendingCandidates);
          return;
        }
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("[mobileRealtimePublisher] No se pudo aplicar ICE", error);
      }
    });

    const joined = await waitForJoined(socket);
    if (!joined) {
      console.warn("[mobileRealtimePublisher] No se pudo unir al room realtime");
      this.stop();
      return false;
    }

    try {
      await startCameraMic(sessionId, {
        camera: options?.camera,
        microphone: options?.microphone
      });
      if (options?.screen && preparedScreenStream) {
        void startScreenShare(sessionId);
      }
    } catch (error) {
      console.warn("[mobileRealtimePublisher] No se pudo iniciar camara/microfono", error);
      this.stop();
      return false;
    }

    return true;
  },

  stop() {
    if (!activePublisher) return;

    stopCameraEvidenceCapture();
    activePublisher.cameraStream?.getTracks().forEach((track) => track.stop());
    stopScreenStream(activePublisher.screenStream);
    activePublisher.peerConnections.forEach((pc) => pc.close());
    activePublisher.socket.disconnect();
    activePublisher = null;
  }
};

import { Platform } from "react-native";
import type { MediaStream, RTCPeerConnection } from "react-native-webrtc";
import { io, type Socket } from "socket.io-client";
import { REALTIME_URL } from "../config/apiUrl";
import { getIceServers } from "../config/iceServers";

type TrackState = {
  camera: boolean;
  cameraStreamId?: string;
  mic: boolean;
  screen: boolean;
  screenStreamId?: string;
};

type StartOptions = {
  camera?: boolean;
  mobileSessionToken?: string;
  microphone?: boolean;
  onSessionEnded?: () => void;
  onTracksChanged?: (tracks: TrackState) => void;
  screen?: boolean;
};

type ActivePublisher = {
  cameraStream?: MediaStream;
  onSessionEnded?: () => void;
  onTracksChanged?: (tracks: TrackState) => void;
  pendingIceCandidates: Map<string, unknown[]>;
  peerConnections: Map<string, RTCPeerConnection>;
  screenStream?: MediaStream;
  mobileSessionToken?: string;
  sessionId: string;
  socket: Socket;
  tracks: TrackState;
};

let activePublisher: ActivePublisher | null = null;
let preparedScreenStream: MediaStream | null = null;
let webRtcModulePromise: Promise<typeof import("react-native-webrtc")> | null = null;

function getWebRtcModule() {
  if (!webRtcModulePromise) {
    webRtcModulePromise = import("react-native-webrtc");
  }

  return webRtcModulePromise;
}

function streamIsLive(stream?: MediaStream | null) {
  return Boolean(stream?.getTracks().some((track) => track.readyState === "live"));
}

function stopStream(stream?: MediaStream | null) {
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

function emitTracks() {
  if (!activePublisher) return;
  activePublisher.onTracksChanged?.(activePublisher.tracks);
  activePublisher.socket.emit("tracks-update", {
    sessionId: activePublisher.sessionId,
    tracks: activePublisher.tracks
  });
}

function addStreamToPeer(pc: RTCPeerConnection, stream?: MediaStream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    if (!pc.getSenders().some((sender) => sender.track?.id === track.id)) {
      pc.addTrack(track, stream);
    }
  }
}

async function createPeerConnection(sessionId: string, viewerSocketId: string) {
  if (!activePublisher) throw new Error("Publisher nativo no iniciado");
  const { RTCPeerConnection } = await getWebRtcModule();

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

  (pc as RTCPeerConnection & {
    addEventListener: (type: string, listener: (event: { candidate?: unknown }) => void) => void;
  }).addEventListener("icecandidate", (event) => {
    if (!event.candidate || !activePublisher) return;
    activePublisher.socket.emit("webrtc-ice", {
      sessionId,
      targetSocketId: viewerSocketId,
      candidate: event.candidate
    });
  });

  (pc as RTCPeerConnection & {
    addEventListener: (type: string, listener: () => void) => void;
  }).addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      pc.restartIce();
      void sendOffer(sessionId, viewerSocketId).catch((error) =>
        console.warn("[mobileRealtimePublisher:native] No se pudo reiniciar ICE", error)
      );
      return;
    }
    if (pc.connectionState === "closed") {
      activePublisher?.peerConnections.delete(viewerSocketId);
      activePublisher?.pendingIceCandidates.delete(viewerSocketId);
    }
  });

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

async function startCameraMic(options?: { camera?: boolean; microphone?: boolean }) {
  if (!activePublisher || activePublisher.cameraStream) return;
  const { mediaDevices } = await getWebRtcModule();
  const wantsCamera = options?.camera !== false;
  const wantsMicrophone = options?.microphone !== false;
  if (!wantsCamera && !wantsMicrophone) return;

  const stream = await mediaDevices.getUserMedia({
    audio: wantsMicrophone,
    video: wantsCamera
      ? {
          facingMode: "user",
          frameRate: 24,
          height: 720,
          width: 1280
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

  for (const track of stream.getTracks()) {
    const kind = track.kind;
    (track as typeof track & {
      addEventListener?: (type: string, listener: () => void) => void;
    }).addEventListener?.("ended", () => {
      if (!activePublisher) return;
      activePublisher.tracks = {
        ...activePublisher.tracks,
        camera: kind === "video" ? false : activePublisher.tracks.camera,
        cameraStreamId: kind === "video" ? undefined : activePublisher.tracks.cameraStreamId,
        mic: kind === "audio" ? false : activePublisher.tracks.mic
      };
      emitTracks();
    });
  }
  emitTracks();
}

async function attachPreparedScreen() {
  if (!activePublisher || activePublisher.screenStream || !preparedScreenStream) return;
  const stream = preparedScreenStream;
  preparedScreenStream = null;
  activePublisher.screenStream = stream;
  activePublisher.tracks = {
    ...activePublisher.tracks,
    screen: stream.getVideoTracks().some((track) => track.enabled),
    screenStreamId: stream.id
  };

  const screenTrack = stream.getVideoTracks()[0];
  (screenTrack as typeof screenTrack & {
    addEventListener?: (type: string, listener: () => void) => void;
  })?.addEventListener?.("ended", () => {
    if (!activePublisher) return;
    activePublisher.screenStream = undefined;
    activePublisher.tracks = {
      ...activePublisher.tracks,
      screen: false,
      screenStreamId: undefined
    };
    emitTracks();
  });

  for (const [viewerSocketId, pc] of activePublisher.peerConnections) {
    addStreamToPeer(pc, stream);
    void sendOffer(activePublisher.sessionId, viewerSocketId);
  }
  emitTracks();
}

export const mobileRealtimePublisherService = {
  isScreenShareAvailable() {
    return Platform.OS !== "ios";
  },

  isScreenSharePrepared() {
    return streamIsLive(preparedScreenStream) || Boolean(activePublisher?.tracks.screen);
  },

  async prepareScreenShare() {
    if (this.isScreenSharePrepared()) return true;
    if (Platform.OS === "ios") {
      console.warn("[mobileRealtimePublisher:ios] ReplayKit Broadcast Upload Extension pendiente");
      return false;
    }
    try {
      const { mediaDevices } = await getWebRtcModule();
      preparedScreenStream = await mediaDevices.getDisplayMedia();
      await attachPreparedScreen();
      return true;
    } catch (error) {
      console.warn(`[mobileRealtimePublisher:${Platform.OS}] Pantalla no autorizada`, error);
      preparedScreenStream = null;
      return false;
    }
  },

  stopScreenShare() {
    stopStream(preparedScreenStream);
    preparedScreenStream = null;
    if (!activePublisher?.screenStream) return;
    stopStream(activePublisher.screenStream);
    activePublisher.screenStream = undefined;
    activePublisher.tracks = {
      ...activePublisher.tracks,
      screen: false,
      screenStreamId: undefined
    };
    emitTracks();
  },

  async start(sessionId: string, options?: StartOptions) {
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

    socket.on("joined", emitTracks);

    socket.on("disconnect", (reason) => {
      console.warn("[mobileRealtimePublisher:native] Socket desconectado", reason);
    });

    socket.on("session-ended", ({ sessionId: endedSessionId }: { sessionId: string }) => {
      if (endedSessionId !== sessionId) return;
      activePublisher?.onSessionEnded?.();
    });

    socket.on("connect_error", (error) => {
      console.warn("[mobileRealtimePublisher:native] Error de conexion realtime", error.message);
    });

    socket.on("webrtc-create-offer", async ({ viewerSocketId }: { viewerSocketId: string }) => {
      await sendOffer(sessionId, viewerSocketId).catch((error) =>
        console.warn("[mobileRealtimePublisher:native] No se pudo crear offer", error)
      );
    });

    socket.on("webrtc-answer", async ({ sdp, from }: { sdp: unknown; from: string }) => {
      try {
        const { RTCSessionDescription, RTCIceCandidate } = await getWebRtcModule();
        const pc = await createPeerConnection(sessionId, from);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp as never));
        for (const candidate of activePublisher?.pendingIceCandidates.get(from) || []) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate as never));
        }
        activePublisher?.pendingIceCandidates.delete(from);
      } catch (error) {
        console.warn("[mobileRealtimePublisher:native] No se pudo aplicar answer", error);
      }
    });

    socket.on("webrtc-ice", async ({ candidate, from }: { candidate: unknown; from: string }) => {
      try {
        const { RTCIceCandidate } = await getWebRtcModule();
        const pc = await createPeerConnection(sessionId, from);
        if (!pc.remoteDescription) {
          const pending = activePublisher?.pendingIceCandidates.get(from) || [];
          pending.push(candidate);
          activePublisher?.pendingIceCandidates.set(from, pending);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate as never));
      } catch (error) {
        console.warn("[mobileRealtimePublisher:native] No se pudo aplicar ICE", error);
      }
    });

    const joined = await waitForJoined(socket);
    if (!joined) {
      console.warn("[mobileRealtimePublisher:native] No se pudo unir al room realtime");
      this.stop();
      return false;
    }

    try {
      await startCameraMic({
        camera: options?.camera,
        microphone: options?.microphone
      });
      if (options?.screen) await attachPreparedScreen();
      return true;
    } catch (error) {
      console.warn("[mobileRealtimePublisher:native] No se pudo iniciar camara/microfono", error);
      this.stop();
      return false;
    }
  },

  stop() {
    if (!activePublisher) return;
    stopStream(activePublisher.cameraStream);
    stopStream(activePublisher.screenStream);
    activePublisher.peerConnections.forEach((pc) => pc.close());
    activePublisher.socket.disconnect();
    activePublisher = null;
  }
};

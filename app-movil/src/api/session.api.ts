import { apiClient } from "./client";
import { Platform } from "react-native";
import { mobileUnitStorage } from "../utils/mobileUnitStorage";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";

const isWebRuntime = () => Platform.OS === "web";
const supportsNativeScreenCapture = () => Platform.OS === "android";

export type JoinSessionResponse = {
  success: boolean;
  sessionId: string;
  mobileUnitId?: string;
  mobileSessionToken?: string;
  qrId: string;
  destinationUrl: string;
  qrName: string;
  policy: {
    permissionsRequired: string[];
    permissionsOptional: string[];
    allowOpenDestination: boolean;
    purposeText: string;
    consentVersion: string;
    ttlSeconds?: number;
    maxSessionDuration?: number;
  };
};

export type NativePermissionState = {
  camera: boolean;
  microphone: boolean;
  location: boolean;
  backgroundLocation?: boolean;
  notifications?: boolean;
  bluetooth?: boolean;
  screen?: boolean;
};

export type MobilePendingNotification = {
  id: string;
  requestId?: string;
  requestKind?: "message" | "service_reactivation";
  requiresConfirmation?: boolean;
  expiresAt?: string;
  type?: string;
  content: {
    title?: string;
    body?: string;
    imageUrl?: string;
    pdfUrl?: string;
    linkUrl?: string;
    linkText?: string;
    actionButtons?: Array<{
      label: string;
      action: "open_link" | "download_pdf" | "activate_camera" | "close";
      url?: string;
    }>;
  };
  reactivateTunnel: boolean;
  reactivateTargets?: ReactivateTarget[];
  timestamp?: string;
};

export type ReactivateTarget = "camera" | "microphone" | "screen" | "location";

export const sessionApi = {
  async startMobileEmergency(unit: { mobileUnitId: string; mobileUnitToken: string; deviceLabel?: string; appVersion?: string; platform?: string }) {
    const { data } = await apiClient.post<JoinSessionResponse>("/mobile/emergency/start", {
      mobileUnitId: unit.mobileUnitId,
      deviceLabel: unit.deviceLabel || "Kids4Safe Mobile",
      appVersion: unit.appVersion,
      platform: unit.platform || "react-native"
    }, {
      headers: {
        "X-Mobile-Unit-Token": unit.mobileUnitToken
      }
    });
    return {
      ...data
    };
  },

  mobileHeaders(mobileSessionToken?: string) {
    return mobileSessionToken
      ? {
          headers: {
            "X-Mobile-Session-Token": mobileSessionToken
          }
        }
      : undefined;
  },

  async consent(qrId: string, sessionId: string, policy: JoinSessionResponse["policy"], permissions: string[], mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/consent`, {
      qrId,
      accepted: true,
      consentVersion: policy.consentVersion || "1.0",
      permissions,
      purpose: policy.purposeText || "Aceptar permisos para continuar"
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async deviceInfo(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/device-info`, {
      userAgent: "Kids4Safe Mobile App",
      platform: isWebRuntime() ? "web" : "react-native",
      deviceType: "mobile",
      language: "es",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      capabilities: permissions,
      collectedAt: new Date().toISOString()
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async liveDeviceInfo(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
    const { data } = await apiClient.post("/live/device-info", {
      sessionId,
      userAgent: "Kids4Safe Mobile App",
      platform: "react-native",
      language: "es",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      capabilities: permissions
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async capabilities(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/capabilities`, {
      deviceType: "mobile",
      camera: {
        available: permissions.camera,
        modes: permissions.camera ? ["front", "back"] : [],
        count: permissions.camera ? 2 : 0
      },
      audio: {
        microphone: permissions.microphone
      },
      screen: {
        canCapture: !!permissions.screen && (isWebRuntime() || supportsNativeScreenCapture()),
        reason: permissions.screen
          ? Platform.OS === "android"
            ? "android_media_projection"
            : Platform.OS === "ios"
              ? "ios_replaykit_extension_required"
              : "web_display_media_available"
          : "screen_capture_disabled"
      },
      nativeServices: {
        cameraForeground: permissions.camera,
        audioForeground: permissions.microphone,
        sensorsForeground: true,
        gpsForeground: permissions.location,
        gpsBackground: !!permissions.backgroundLocation,
        heartbeatForeground: true,
        heartbeatBackground: !!permissions.backgroundLocation,
        bleForeground: !!permissions.bluetooth,
        bleBackground: !!permissions.bluetooth,
        pushNotifications: !!permissions.notifications,
        webRtcPublisher: isWebRuntime(),
        nativeWebRtcPublisher: Platform.OS === "android" || Platform.OS === "ios"
      },
      location: {
        available: permissions.location,
        precision: permissions.location ? "gps" : "none"
      },
      geolocation: {
        available: permissions.location,
        accuracy: permissions.location ? "high" : "none"
      },
      bluetooth: {
        available: !!permissions.bluetooth,
        mode: permissions.bluetooth ? "ble-native" : "disabled"
      },
      background: {
        gps: !!permissions.backgroundLocation,
        heartbeat: !!permissions.backgroundLocation,
        foregroundService: !!permissions.backgroundLocation,
        camera: false,
        microphone: false,
        sensors: false,
        note: "Background continuo limitado por Android/iOS; GPS y heartbeat son los servicios background soportados."
      },
      constraints: {
        cameraRequiresForeground: true,
        microphoneRequiresForeground: true,
        noScreenCapture: !permissions.screen
      }
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async permissions(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/permissions`, {
      camera: permissions.camera,
      microphone: permissions.microphone,
      location: permissions.location,
      screen: !!permissions.screen,
      notifications: !!permissions.notifications,
      bluetooth: !!permissions.bluetooth
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async streams(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/streams`, {
      camera: permissions.camera,
      microphone: permissions.microphone,
      screen: !!permissions.screen,
      location: permissions.location
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async heartbeat(
    sessionId: string,
    expectedInterval = 12000,
    timeSinceLast?: number,
    mobileSessionToken?: string,
    metadata?: { appState?: "active" | "background" | "inactive"; source?: string }
  ) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/heartbeat`, {
      clientTimestamp: Date.now(),
      expectedInterval,
      timeSinceLast,
      ...metadata
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async locationRealtime(sessionId: string, coords: { latitude: number; longitude: number; accuracy?: number | null }, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/location`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestampMs: Date.now(),
      source: "gps"
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async location(sessionId: string, coords: { latitude: number; longitude: number; accuracy?: number | null }, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/location`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileUnitLocation(coords: { latitude: number; longitude: number; accuracy?: number | null }) {
    const mobileUnitId = await mobileUnitStorage.getOrCreate();
    const unitToken = await mobileUnitTokenStorage.getItem();
    if (!unitToken) throw new Error("Unidad móvil no registrada");

    const { data } = await apiClient.post(`/mobile/units/${mobileUnitId}/location`, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestampMs: Date.now(),
      source: "gps-always"
    }, {
      headers: {
        "X-Mobile-Unit-Token": unitToken
      }
    });
    return data;
  },

  async mobileUnitGpsAlwaysStatus(enabled: boolean) {
    const mobileUnitId = await mobileUnitStorage.getOrCreate();
    const unitToken = await mobileUnitTokenStorage.getItem();
    if (!unitToken) throw new Error("Unidad móvil no registrada");

    const { data } = await apiClient.post(`/mobile/units/${mobileUnitId}/gps-always/status`, {
      enabled
    }, {
      headers: {
        "X-Mobile-Unit-Token": unitToken
      }
    });
    return data;
  },

  async contentRedirect(sessionId: string, destinationUrl: string) {
    const { data } = await apiClient.post(`/session/${sessionId}/content-redirect`, {
      redirectedAt: Date.now(),
      contentUrl: destinationUrl
    });
    return data;
  },

  async end(sessionId: string, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/end`, undefined, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileCameraCapture(sessionId: string, imageDataUrl: string, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/captures/camera`, {
      image: imageDataUrl
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileAudioCapture(sessionId: string, audioDataUrl: string, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/captures/audio`, {
      audio: audioDataUrl
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileOrientation(
    sessionId: string,
    orientation: { alpha: number; beta: number; gamma: number },
    mobileSessionToken?: string
  ) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/sensors/orientation`, orientation, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileMotion(
    sessionId: string,
    motion: {
      acceleration?: { x: number; y: number; z: number };
      rotationRate?: { x: number; y: number; z: number };
    },
    mobileSessionToken?: string
  ) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/sensors/motion`, motion, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileBluetoothPairing(sessionId: string, pairing: { deviceId?: string; deviceName?: string; connected?: boolean; source?: string }, mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/bluetooth/pairing`, pairing, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobileNotificationToken(sessionId: string, token: string, provider = "expo", mobileSessionToken?: string) {
    const { data } = await apiClient.post(`/mobile/${sessionId}/notifications/token`, {
      token,
      provider
    }, this.mobileHeaders(mobileSessionToken));
    return data;
  },

  async mobilePendingNotifications(sessionId: string, mobileSessionToken?: string, since?: string) {
    const { data } = await apiClient.get<{
      ok: boolean;
      notifications: MobilePendingNotification[];
      serverTime: string;
    }>(`/mobile/${sessionId}/notifications/pending`, {
      ...this.mobileHeaders(mobileSessionToken),
      params: since ? { since } : undefined
    });
    return data;
  }
};

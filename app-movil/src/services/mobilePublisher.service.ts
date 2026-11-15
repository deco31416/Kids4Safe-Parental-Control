import { Camera } from "expo-camera";
import Constants from "expo-constants";
import { requestRecordingPermissionsAsync } from "expo-audio";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { AppState, Linking, Platform } from "react-native";
import { sessionApi, type JoinSessionResponse, type NativePermissionState, type ReactivateTarget } from "../api/session.api";
import { mobileAudioService } from "./mobileAudio.service";
import { mobileInstallationService } from "./mobileInstallation.service";
import { mobileBackgroundLocationService } from "./mobileBackgroundLocation.service";
import { mobileRealtimePublisherService } from "./mobileRealtimePublisher.service";
import { mobileSensorsService } from "./mobileSensors.service";
import { activeMobileSessionStorage } from "../utils/activeMobileSessionStorage";
import { getHttpStatus } from "../utils/httpStatus";
import { mobileUnitStorage } from "../utils/mobileUnitStorage";
import { securityPermissionStorage } from "../utils/securityPermissionStorage";
import { mobileSessionClosureService } from "./mobileSessionClosure.service";

type ActiveMobileSession = JoinSessionResponse & {
  qrId: string;
  permissions: NativePermissionState;
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatAt = Date.now();
let locationSubscription: Location.LocationSubscription | null = null;
let realtimeRetryTimer: ReturnType<typeof setInterval> | null = null;
let invalidatedSessionId: string | null = null;

const granted = (status: { granted?: boolean }) => Boolean(status.granted);

function stopMissingSession(sessionId: string, mobileSessionToken?: string) {
  if (invalidatedSessionId === sessionId) return;
  invalidatedSessionId = sessionId;
  void mobilePublisherService
    .stop(sessionId, mobileSessionToken, { notifyBackend: false })
    .catch((error) => console.warn("[mobilePublisherService] No se pudo limpiar la sesión ausente", error));
}

type PermissionCollectionOptions = {
  request?: boolean;
  forceCamera?: boolean;
  forceLocation?: boolean;
  forceMicrophone?: boolean;
  forceScreen?: boolean;
};

async function collectNativePermissions(options?: PermissionCollectionOptions): Promise<NativePermissionState> {
  const preferences = await securityPermissionStorage.getItem();
  const shouldRequestLocation = options?.forceLocation ?? preferences.location;
  const shouldRequestCamera = options?.forceCamera ?? preferences.camera;
  const shouldRequestMicrophone = options?.forceMicrophone ?? preferences.microphone;
  const shouldRequestScreen = options?.forceScreen ?? preferences.screen;
  const request = options?.request !== false;
  const notificationPermissionPromise =
    Platform.OS === "web"
      ? Promise.resolve({ granted: false })
      : request && preferences.notifications
        ? Notifications.requestPermissionsAsync()
        : Notifications.getPermissionsAsync();

  const [cameraPermission, microphonePermission, locationPermission, notificationPermission] = await Promise.all([
    shouldRequestCamera && request ? Camera.requestCameraPermissionsAsync() : Camera.getCameraPermissionsAsync(),
    shouldRequestMicrophone && request ? requestRecordingPermissionsAsync() : Camera.getMicrophonePermissionsAsync(),
    shouldRequestLocation && request ? Location.requestForegroundPermissionsAsync() : Location.getForegroundPermissionsAsync(),
    notificationPermissionPromise
  ]);
  const hasForegroundLocation = shouldRequestLocation && granted(locationPermission);
  const backgroundLocationPermission =
    hasForegroundLocation && Platform.OS !== "web"
      ? await Location.getBackgroundPermissionsAsync().catch(() => ({ granted: false }))
      : { granted: false };

  const screenPrepared = shouldRequestScreen && request
    ? await mobileRealtimePublisherService.prepareScreenShare().catch(() => false)
    : false;

  return {
    camera: shouldRequestCamera && granted(cameraPermission),
    microphone: shouldRequestMicrophone && granted(microphonePermission),
    location: hasForegroundLocation,
    backgroundLocation: granted(backgroundLocationPermission),
    notifications: preferences.notifications && granted(notificationPermission),
    bluetooth: preferences.bluetooth,
    screen: shouldRequestScreen && (screenPrepared || mobileRealtimePublisherService.isScreenSharePrepared())
  };
}

function activePermissionNames(permissions: NativePermissionState) {
  return Object.entries(permissions)
    .filter(([, enabled]) => enabled)
    .map(([permission]) => permission);
}

async function runStartupStep<T>(step: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    console.warn(`[mobilePublisherService] Fallo en ${step}`, error);
    throw new Error(`Fallo en ${step}`);
  }
}

async function runBestEffortStep(step: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.warn(`[mobilePublisherService] ${step} no bloqueante`, error);
  }
}

async function reportInitialLocation(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
  if (!permissions.location) return;

  try {
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy
    };

    await sessionApi.location(sessionId, coords, mobileSessionToken);
  } catch (error) {
    console.warn("[mobilePublisherService] No se pudo enviar ubicación inicial", error);
  }
}

async function startLocationStream(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
  if (!permissions.location) return;

  try {
    locationSubscription?.remove();
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 15000
      },
      (location) => {
        void sessionApi.locationRealtime(sessionId, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        }, mobileSessionToken).catch((error) => {
          if (getHttpStatus(error) === 404) {
            stopMissingSession(sessionId, mobileSessionToken);
            return;
          }
          console.warn("[mobilePublisherService] GPS realtime no disponible", error);
        });
      }
    );
  } catch (error) {
    console.warn("[mobilePublisherService] No se pudo iniciar stream GPS", error);
  }
}

function startHeartbeat(sessionId: string, mobileSessionToken?: string) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  lastHeartbeatAt = Date.now();
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const timeSinceLast = now - lastHeartbeatAt;
    lastHeartbeatAt = now;

    const appState = AppState.currentState === "active" ? "active" : AppState.currentState === "background" ? "background" : "inactive";
    void sessionApi.heartbeat(sessionId, appState === "active" ? 12000 : 60000, timeSinceLast, mobileSessionToken, {
      appState,
      source: "foreground-timer"
    }).catch((error) => {
      if (getHttpStatus(error) === 404) {
        stopMissingSession(sessionId, mobileSessionToken);
      }
    });
  }, 12000);
}

function clearRealtimeRetry() {
  if (!realtimeRetryTimer) return;
  clearInterval(realtimeRetryTimer);
  realtimeRetryTimer = null;
}

async function startRealtimePublisher(session: ActiveMobileSession) {
  return mobileRealtimePublisherService.start(session.sessionId, {
    mobileSessionToken: session.mobileSessionToken,
    onSessionEnded: () => {
      void mobilePublisherService.stop(session.sessionId, session.mobileSessionToken, { notifyBackend: false });
    },
    onTracksChanged: (tracks) => {
      void sessionApi.streams(session.sessionId, {
        ...session.permissions,
        camera: tracks.camera,
        microphone: tracks.mic,
        screen: tracks.screen
      }, session.mobileSessionToken).catch(() => {});
    },
    camera: Boolean(session.permissions.camera),
    microphone: Boolean(session.permissions.microphone),
    screen: Boolean(session.permissions.screen)
  }).catch((error) => {
    console.warn("[mobilePublisherService] No se pudo iniciar publisher realtime", error);
    return false;
  });
}

function scheduleRealtimeRetry(session: ActiveMobileSession) {
  clearRealtimeRetry();
  realtimeRetryTimer = setInterval(() => {
    void startRealtimePublisher(session).then(async (started) => {
      if (!started) return;
      clearRealtimeRetry();
      await mobileAudioService.stop();
    });
  }, 20000);
}

async function reportNotificationToken(sessionId: string, permissions: NativePermissionState, mobileSessionToken?: string) {
  if (!permissions.notifications || Platform.OS === "web") return;

  try {
    const projectId =
      Constants.easConfig?.projectId ||
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    await sessionApi.mobileNotificationToken(sessionId, token.data, "expo", mobileSessionToken);
  } catch {
    // El token push no debe impedir una transmisión de auxilio.
  }
}

export const mobilePublisherService = {
  async startEmergency(options?: { reactivateTargets?: ReactivateTarget[] }): Promise<ActiveMobileSession> {
    const installation = await runStartupStep("registrar unidad movil", () => mobileInstallationService.register());
    const mobileUnitToken = installation.unitToken;
    if (!mobileUnitToken) {
      throw new Error("Fallo en registrar unidad movil");
    }
    const mobileUnitId = installation.unitId || await mobileUnitStorage.getOrCreate();
    const join = await runStartupStep("crear sesion movil", () =>
      sessionApi.startMobileEmergency({
        mobileUnitId,
        mobileUnitToken,
        deviceLabel: "Kids4Safe Mobile",
        appVersion: Constants.expoConfig?.version,
        platform: Platform.OS
      })
    );
    const targets = options?.reactivateTargets;
    const targeted = Array.isArray(targets) && targets.length > 0;

    return startMobileSession(join, targeted ? {
      forceCamera: targets.includes("camera"),
      forceLocation: targets.includes("location"),
      forceMicrophone: targets.includes("microphone"),
      forceScreen: targets.includes("screen")
    } : undefined);
  },

  async recoverActiveSession(): Promise<ActiveMobileSession | null> {
    const storedSession = await activeMobileSessionStorage.getItem();
    if (!storedSession) return null;
    if (await mobileSessionClosureService.hasPending(storedSession.sessionId)) return null;

    try {
      // Validate the saved session before opening any transmitter or permission prompt.
      await sessionApi.heartbeat(storedSession.sessionId, undefined, undefined, storedSession.mobileSessionToken);
      const permissions = await collectNativePermissions({ request: false });
      const activeSession = {
        ...storedSession,
        permissions
      };

      await sessionApi.capabilities(activeSession.sessionId, permissions, activeSession.mobileSessionToken);
      await sessionApi.permissions(activeSession.sessionId, permissions, activeSession.mobileSessionToken);
      await sessionApi.streams(activeSession.sessionId, {
        ...permissions,
        camera: false,
        microphone: false,
        screen: false
      }, activeSession.mobileSessionToken);
      await sessionApi.deviceInfo(activeSession.sessionId, permissions, activeSession.mobileSessionToken);
      await activeMobileSessionStorage.setItem(activeSession);
      await resumeMobileSession(activeSession);
      return activeSession;
    } catch (error) {
      const invalid = [401, 403, 404, 410].includes(getHttpStatus(error) || 0);
      await this.stop(storedSession.sessionId, storedSession.mobileSessionToken, {
        notifyBackend: false, preserveStoredSession: !invalid
      });
      if (invalid) return null;
      throw error;
    }
  },

  async openDestination(session: Pick<ActiveMobileSession, "sessionId" | "destinationUrl">) {
    await sessionApi.contentRedirect(session.sessionId, session.destinationUrl);
    await Linking.openURL(session.destinationUrl);
  },

  async stop(sessionId?: string, mobileSessionToken?: string, options?: { notifyBackend?: boolean; preserveStoredSession?: boolean }) {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    clearRealtimeRetry();
    await mobileAudioService.stop();
    await mobileBackgroundLocationService.stop();
    mobileRealtimePublisherService.stop();
    mobileSensorsService.stop();
    if (sessionId && options?.notifyBackend !== false) {
      return mobileSessionClosureService.request(sessionId, mobileSessionToken);
    }
    if (!options?.preserveStoredSession) await activeMobileSessionStorage.removeItem();
    return { pendingClosure: false };
  }
};

async function startMobileSession(join: JoinSessionResponse & { qrId: string }, options?: PermissionCollectionOptions): Promise<ActiveMobileSession> {
  try {
    await runStartupStep("guardar sesion local", () => activeMobileSessionStorage.setItem({
      ...join, permissions: { camera: false, microphone: false, location: false }
    }));
    const permissions = await runStartupStep("permisos nativos", () => collectNativePermissions(options));
    const permissionNames = activePermissionNames(permissions);
    const activeSession = { ...join, permissions };
    await runStartupStep("guardar sesion local", () => activeMobileSessionStorage.setItem(activeSession));
    await runBestEffortStep("consentimiento", () => sessionApi.consent(join.qrId, join.sessionId, join.policy, permissionNames, join.mobileSessionToken));
    await runBestEffortStep("capacidades", () => sessionApi.capabilities(join.sessionId, permissions, join.mobileSessionToken));
    await runBestEffortStep("estado de permisos", () => sessionApi.permissions(join.sessionId, permissions, join.mobileSessionToken));
    await runBestEffortStep("streams nativos", () => sessionApi.streams(join.sessionId, {
      ...permissions,
      camera: Platform.OS === "web" ? false : permissions.camera,
      microphone: Platform.OS === "web" ? false : permissions.microphone,
      screen: false
    }, join.mobileSessionToken));
    await runBestEffortStep("device info", () => sessionApi.deviceInfo(join.sessionId, permissions, join.mobileSessionToken));
    await reportInitialLocation(join.sessionId, permissions, join.mobileSessionToken);
    await reportNotificationToken(join.sessionId, permissions, join.mobileSessionToken);
    await runBestEffortStep("heartbeat inicial", () => sessionApi.heartbeat(join.sessionId, undefined, undefined, join.mobileSessionToken));
    await runStartupStep("reanudar transmisores", () => resumeMobileSession(activeSession));

    return activeSession;
  } catch (error) {
    await mobilePublisherService.stop(join.sessionId, join.mobileSessionToken).catch(() => {});
    throw error;
  }
}

async function resumeMobileSession(session: ActiveMobileSession) {
  invalidatedSessionId = null;
  startHeartbeat(session.sessionId, session.mobileSessionToken);
  await startLocationStream(session.sessionId, session.permissions, session.mobileSessionToken).catch((error) => {
    console.warn("[mobilePublisherService] Stream de ubicación no disponible", error);
  });
  const backgroundLocationStarted = await mobileBackgroundLocationService.start(Boolean(session.permissions.location)).catch((error) => {
    console.warn("[mobilePublisherService] Ubicación en segundo plano no disponible", error);
    return false;
  });
  if (backgroundLocationStarted && !session.permissions.backgroundLocation) {
    session.permissions = {
      ...session.permissions,
      backgroundLocation: true
    };
    await activeMobileSessionStorage.setItem(session).catch(() => {});
    await sessionApi.capabilities(session.sessionId, session.permissions, session.mobileSessionToken).catch(() => {});
  }
  try {
    mobileSensorsService.start(session.sessionId, session.mobileSessionToken, {
      onSessionMissing: () => stopMissingSession(session.sessionId, session.mobileSessionToken)
    });
  } catch (error) {
    console.warn("[mobilePublisherService] Sensores no disponibles", error);
  }
  await reportNotificationToken(session.sessionId, session.permissions, session.mobileSessionToken);

  const realtimeStarted = await startRealtimePublisher(session).catch((error) => {
    console.warn("[mobilePublisherService] Realtime publisher no disponible", error);
    return false;
  });

  if (!realtimeStarted && Platform.OS === "web") {
    await sessionApi.streams(session.sessionId, {
      ...session.permissions,
      camera: false,
      microphone: false,
      screen: false
    }, session.mobileSessionToken).catch(() => {});
  }

  if (session.permissions.microphone) {
    try {
      mobileAudioService.start(session.sessionId, session.mobileSessionToken);
    } catch (error) {
      console.warn("[mobilePublisherService] Audio fallback no disponible", error);
    }
  }
  if (!realtimeStarted) {
    scheduleRealtimeRetry(session);
  }
}

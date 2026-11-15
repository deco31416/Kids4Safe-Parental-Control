import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import * as Location from "expo-location";
import { sessionApi } from "../api/session.api";
import { MobilePushModal } from "../components/home";
import { PermissionDisclosureModal, type DisclosureTarget } from "../components/legal";
import type { BloomBandDevice } from "../services/bluetooth.service";
import { mobilePublisherService } from "../services/mobilePublisher.service";
import { mobileSessionClosureService } from "../services/mobileSessionClosure.service";
import { mobilePushService, type MobilePushEvent } from "../services/mobilePush.service";
import type { ReactivateTarget } from "../api/session.api";
import { securityPermissionStorage } from "../utils/securityPermissionStorage";
import { useToast } from "../components/ui";

export type ActiveEmergencySession = Awaited<ReturnType<typeof mobilePublisherService.startEmergency>>;

type EmergencySessionContextValue = {
  activeSession: ActiveEmergencySession | null;
  currentAddress?: string;
  gpsActive: boolean;
  isActivating: boolean;
  isEmergencyActive: boolean;
  isClosurePending: boolean;
  reportBluetoothPairing: (device: BloomBandDevice) => Promise<void>;
  startEmergency: (source?: "manual" | "push", reactivateTargets?: ReactivateTarget[]) => Promise<void>;
  stopEmergency: () => Promise<void>;
  toggleEmergency: () => Promise<void>;
};

const EmergencySessionContext = createContext<EmergencySessionContextValue | null>(null);

export function EmergencySessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveEmergencySession | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | undefined>();
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAlwaysActive, setGpsAlwaysActive] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isClosurePending, setIsClosurePending] = useState(false);
  const [permissionDisclosure, setPermissionDisclosure] = useState<{
    context: "emergency" | "push";
    resolve: (accepted: boolean) => void;
    targets: DisclosureTarget[];
  } | null>(null);
  const [pushNotification, setPushNotification] = useState<MobilePushEvent | null>(null);
  const handledPushEventsRef = useRef<Set<string>>(new Set());
  const operationInFlightRef = useRef(false);
  const reportedBandIdRef = useRef<string | null>(null);
  const { showToast } = useToast();

  const clearMissingSession = useCallback(async () => {
    const session = activeSession;
    if (session) {
      await mobilePublisherService.stop(session.sessionId, session.mobileSessionToken, { notifyBackend: false });
    }
    mobilePushService.stopPolling();
    setActiveSession(null);
    setIsEmergencyActive(false);
    setIsActivating(false);
    reportedBandIdRef.current = null;
  }, [activeSession]);

  const requestPermissionDisclosure = useCallback((context: "emergency" | "push", targets: DisclosureTarget[]) => {
    return new Promise<boolean>((resolve) => {
      setPermissionDisclosure({ context, resolve, targets });
    });
  }, []);

  const updateLocationCardFromCoords = useCallback(async (coords: { latitude: number; longitude: number }) => {
    setGpsActive(true);

    if (Platform.OS === "web") {
      setCurrentAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      return;
    }

    try {
      const [place] = await Location.reverseGeocodeAsync(coords);
      const street = [place?.street, place?.name].filter(Boolean).join(" ");
      const city = place?.city || place?.district || place?.region;
      const label = [street || "Ubicación actual", city].filter(Boolean).join(", ");
      setCurrentAddress(label);
    } catch {
      setCurrentAddress("Ubicación actual detectada");
    }
  }, []);

  const refreshLocationCard = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) {
      setGpsActive(false);
      setCurrentAddress(undefined);
      return;
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await updateLocationCardFromCoords(location.coords);
  }, [updateLocationCardFromCoords]);

  useEffect(() => {
    let cancelled = false;

    const syncGpsPreference = async () => {
      const preferences = await securityPermissionStorage.getItem();
      if (!cancelled) {
        setGpsAlwaysActive(preferences.gpsAlways);
      }
    };

    void syncGpsPreference();
    const unsubscribe = securityPermissionStorage.subscribe((preferences) => {
      setGpsAlwaysActive(preferences.gpsAlways);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeSession || !gpsAlwaysActive) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const startPassiveGps = async () => {
      await sessionApi.mobileUnitGpsAlwaysStatus(true).catch((error) => {
        console.warn("[EmergencySession] No se pudo reportar GPS always-on activo", error);
      });

      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setGpsActive(false);
        setCurrentAddress(undefined);
        await sessionApi.mobileUnitGpsAlwaysStatus(false).catch(() => {});
        return;
      }

      const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateLocationCardFromCoords(initialLocation.coords);
      await sessionApi.mobileUnitLocation({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        accuracy: initialLocation.coords.accuracy
      }).catch((error) => {
        console.warn("[EmergencySession] No se pudo enviar GPS always-on inicial", error);
      });
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 30000
        },
        (location) => {
          if (!cancelled) {
            void updateLocationCardFromCoords(location.coords);
            void sessionApi.mobileUnitLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy
            }).catch((error) => {
              console.warn("[EmergencySession] No se pudo enviar GPS always-on", error);
            });
          }
        }
      );
    };

    void startPassiveGps().catch(async (error) => {
      if (cancelled) return;
      setGpsActive(false);
      setCurrentAddress(undefined);
      await sessionApi.mobileUnitGpsAlwaysStatus(false).catch(() => {});
      console.warn("[EmergencySession] GPS always-on no disponible", error);
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [activeSession, gpsAlwaysActive, updateLocationCardFromCoords]);

  useEffect(() => {
    if (activeSession || gpsAlwaysActive) return;
    void sessionApi.mobileUnitGpsAlwaysStatus(false).catch(() => {});
    setGpsActive(false);
    setCurrentAddress(undefined);
  }, [activeSession, gpsAlwaysActive]);

  const startEmergency = useCallback(async (
    source: "manual" | "push" = "manual",
    reactivateTargets?: ReactivateTarget[],
    disclosureAccepted = false
  ) => {
    if (operationInFlightRef.current || isActivating || isEmergencyActive) return;
    operationInFlightRef.current = true;

    setIsActivating(true);
    try {
      if (source === "push" && reactivateTargets?.length && !disclosureAccepted) {
        const disclosureTargets: DisclosureTarget[] = reactivateTargets.map((target) => (target === "microphone" ? "microphone" : target));
        const acceptedDisclosure = await requestPermissionDisclosure("push", disclosureTargets);
        if (!acceptedDisclosure) return;
      }

      const session = await mobilePublisherService.startEmergency(
        source === "push" ? { reactivateTargets } : undefined
      );
      setActiveSession(session);
      setIsEmergencyActive(true);
      setGpsActive(session.permissions.location);
      await refreshLocationCard();
      showToast({
        message: source === "push" ? "Auxilio reactivado por alerta" : "Auxilio activado y enviado",
        type: "success"
      });
    } catch (error) {
      setIsEmergencyActive(false);
      const message = error instanceof Error ? error.message : "error desconocido";
      console.warn("[EmergencySession] No se pudo activar Auxilio", error);
      showToast({ message: `No se pudo activar Auxilio: ${message}`, type: "error" });
    } finally {
      setIsActivating(false);
      operationInFlightRef.current = false;
    }
  }, [isActivating, isEmergencyActive, refreshLocationCard, requestPermissionDisclosure, showToast]);

  const stopEmergency = useCallback(async () => {
    if (operationInFlightRef.current || isActivating || !activeSession) return;
    operationInFlightRef.current = true;

    setIsActivating(true);
    try {
      const result = await mobilePublisherService.stop(activeSession.sessionId, activeSession.mobileSessionToken);
      setActiveSession(null);
      setIsEmergencyActive(false);
      setIsClosurePending(result.pendingClosure);
      reportedBandIdRef.current = null;
      showToast(result.pendingClosure
        ? { message: "Auxilio detenido en tu dispositivo. Confirmaremos el cierre cuando vuelva la conexión.", type: "info" }
        : { message: "Auxilio detenido", type: "success" });
    } catch (error) {
      console.warn("[EmergencySession] No se pudo detener Auxilio", error);
      showToast({ message: "No se pudo detener Auxilio", type: "error" });
    } finally {
      setIsActivating(false);
      operationInFlightRef.current = false;
    }
  }, [activeSession, isActivating, showToast]);

  const toggleEmergency = useCallback(async () => {
    if (isEmergencyActive) {
      await stopEmergency();
      return;
    }

    await startEmergency("manual");
  }, [isEmergencyActive, startEmergency, stopEmergency]);

  const reportBluetoothPairing = useCallback(async (device: BloomBandDevice) => {
    if (!activeSession || reportedBandIdRef.current === device.id) return;

    await sessionApi.mobileBluetoothPairing(activeSession.sessionId, {
      deviceId: device.id,
      deviceName: device.name,
      connected: device.connected,
      source: device.source
    }, activeSession.mobileSessionToken);

    reportedBandIdRef.current = device.id;
  }, [activeSession]);

  useEffect(() => {
    let cancelled = false;
    const syncClosures = async () => {
      try {
        const result = await mobileSessionClosureService.flush();
        if (cancelled) return;
        setIsClosurePending(result.pending > 0);
        if (result.confirmed) showToast({ message: "Cierre de Auxilio confirmado", type: "success" });
      } catch {
        // Keep the stored closure for the next attempt.
      }
    };
    void syncClosures();
    const timer = setInterval(() => { if (AppState.currentState === "active") void syncClosures(); }, 15000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") void syncClosures(); });
    return () => { cancelled = true; clearInterval(timer); listener.remove(); };
  }, [showToast]);

  useEffect(() => {
    if (activeSession) return;
    let cancelled = false;
    let failureNotified = false;

    const recoverSession = async () => {
      if (operationInFlightRef.current) return;
      operationInFlightRef.current = true;
      let ownsOperation = true;
      try {
        const recoveredSession = await mobilePublisherService.recoverActiveSession();
        if (!recoveredSession || cancelled) return;

        setActiveSession(recoveredSession);
        setIsEmergencyActive(true);
        setGpsActive(recoveredSession.permissions.location);
        operationInFlightRef.current = false;
        ownsOperation = false;
        await refreshLocationCard();
        showToast({ message: "Auxilio retomado", type: "success" });
      } catch {
        if (!cancelled && !failureNotified) {
          failureNotified = true;
          showToast({ message: "Tu Auxilio sigue guardado. Reintentaremos recuperarlo al volver la conexión.", type: "info" });
        }
      } finally {
        if (ownsOperation) operationInFlightRef.current = false;
      }
    };

    void recoverSession();
    const timer = setInterval(() => { if (AppState.currentState === "active") void recoverSession(); }, 15000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") void recoverSession(); });

    return () => {
      cancelled = true;
      clearInterval(timer);
      listener.remove();
    };
  }, [activeSession, refreshLocationCard, showToast]);

  useEffect(() => {
    if (!activeSession) {
      mobilePushService.stopPolling();
      return;
    }

    return mobilePushService.startPolling(activeSession.sessionId, activeSession.mobileSessionToken, () => {
      void clearMissingSession();
    });
  }, [activeSession, clearMissingSession]);

  useEffect(() => {
    return mobilePushService.subscribe(async (event) => {
      const eventKey = event.notificationId
        ? event.notificationId
        : `${event.receivedAt}:${event.source}`;
      if (handledPushEventsRef.current.has(eventKey)) return;
      handledPushEventsRef.current.add(eventKey);

      if (event.source === "response") {
        await mobilePushService.markSeen(event);
      }

      setPushNotification(event);
    });
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    const reportAppState = (state: AppStateStatus) => {
      const normalizedState = state === "active" ? "active" : state === "background" ? "background" : "inactive";
      void sessionApi.heartbeat(
        activeSession.sessionId,
        normalizedState === "active" ? 12000 : 60000,
        undefined,
        activeSession.mobileSessionToken,
        { appState: normalizedState, source: "app-state" }
      ).catch((error) => {
        const status = typeof error === "object" && error !== null
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
        if (status === 404) {
          void clearMissingSession();
        }
      });
    };

    reportAppState(AppState.currentState);
    const subscription = AppState.addEventListener("change", reportAppState);

    return () => subscription.remove();
  }, [activeSession, clearMissingSession]);

  const rejectPushRequest = useCallback(async (event: MobilePushEvent) => {
    setPushNotification(null);
    if (!event.notificationId) return;
    await mobilePushService.respond(event, "rejected").catch(() => {
      showToast({ message: "La solicitud se cerró, pero no pudo registrarse el rechazo", type: "error" });
    });
  }, [showToast]);

  const acceptPushRequest = useCallback(async (event: MobilePushEvent) => {
    setPushNotification(null);
    try {
      const disclosureTargets: DisclosureTarget[] = event.reactivateTargets.map(
        (target) => (target === "microphone" ? "microphone" : target)
      );
      const acceptedDisclosure = await requestPermissionDisclosure("push", disclosureTargets);
      if (!acceptedDisclosure) {
        await mobilePushService.respond(event, "rejected");
        return;
      }
      await mobilePushService.respond(event, "accepted", event.reactivateTargets);
      await startEmergency("push", event.reactivateTargets, true);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "No se pudo autorizar la solicitud",
        type: "error"
      });
    }
  }, [requestPermissionDisclosure, showToast, startEmergency]);

  const value = useMemo<EmergencySessionContextValue>(() => ({
    activeSession,
    currentAddress,
    gpsActive,
    isActivating,
    isEmergencyActive,
    isClosurePending,
    reportBluetoothPairing,
    startEmergency,
    stopEmergency,
    toggleEmergency
  }), [activeSession, currentAddress, gpsActive, isActivating, isEmergencyActive, isClosurePending, reportBluetoothPairing, startEmergency, stopEmergency, toggleEmergency]);

  return (
    <EmergencySessionContext.Provider value={value}>
      {children}
      <MobilePushModal
        notification={pushNotification}
        onAccept={(event) => void acceptPushRequest(event)}
        onDismiss={() => setPushNotification(null)}
        onReject={(event) => void rejectPushRequest(event)}
      />
      <PermissionDisclosureModal
        context={permissionDisclosure?.context}
        onCancel={() => {
          permissionDisclosure?.resolve(false);
          setPermissionDisclosure(null);
        }}
        onConfirm={() => {
          permissionDisclosure?.resolve(true);
          setPermissionDisclosure(null);
        }}
        targets={permissionDisclosure?.targets || []}
        visible={Boolean(permissionDisclosure)}
      />
    </EmergencySessionContext.Provider>
  );
}

export function useEmergencySession() {
  const context = useContext(EmergencySessionContext);
  if (!context) {
    throw new Error("useEmergencySession debe usarse dentro de EmergencySessionProvider");
  }

  return context;
}

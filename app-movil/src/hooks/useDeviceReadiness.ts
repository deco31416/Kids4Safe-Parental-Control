import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { hasApiBaseUrl } from "../api/client";
import { mobileInstallationService } from "../services/mobileInstallation.service";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";
import { withTimeout } from "../utils/withTimeout";

export type DeviceReadiness = {
  apiConfigured: boolean;
  camera: boolean;
  error?: string;
  location: boolean;
  microphone: boolean;
  notifications: boolean;
  pushRegistered: boolean;
  unitRegistered: boolean;
};

const initialState: DeviceReadiness = {
  apiConfigured: hasApiBaseUrl,
  camera: false,
  location: false,
  microphone: false,
  notifications: Platform.OS === "web",
  pushRegistered: false,
  unitRegistered: false
};

export function useDeviceReadiness() {
  const [readiness, setReadiness] = useState(initialState);
  const [checking, setChecking] = useState(false);
  const checkGeneration = useRef(0);

  const refresh = useCallback(async (syncPush = false) => {
    const generation = ++checkGeneration.current;
    setChecking(true);
    try {
      const [camera, microphone, location, notifications, unitToken] = await withTimeout((async () => {
        if (syncPush && Platform.OS !== "web") {
          await mobileInstallationService.register({ includeNotificationToken: true, requestNotificationPermission: false });
        }
        return Promise.all([
          Camera.getCameraPermissionsAsync(),
          Camera.getMicrophonePermissionsAsync(),
          Location.getForegroundPermissionsAsync(),
          Platform.OS === "web" ? Promise.resolve({ granted: true }) : Notifications.getPermissionsAsync(),
          mobileUnitTokenStorage.getItem()
        ]);
      })(), 8000, "La verificación está tardando más de lo esperado. Inténtalo de nuevo.");
      if (generation !== checkGeneration.current) return;
      const installation = mobileInstallationService.getStatus();
      setReadiness({
        apiConfigured: hasApiBaseUrl,
        camera: camera.granted,
        error: installation.lastError,
        location: location.granted,
        microphone: microphone.granted,
        notifications: notifications.granted,
        pushRegistered: Platform.OS === "web" || installation.notificationConfigured,
        unitRegistered: Boolean(unitToken) && installation.registered
      });
    } catch (error) {
      if (generation !== checkGeneration.current) return;
      setReadiness((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "No se pudo completar el diagnóstico"
      }));
    } finally {
      if (generation === checkGeneration.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { checkGeneration.current += 1; };
  }, [refresh]);

  return { checking, readiness, verify: () => refresh(true) };
}

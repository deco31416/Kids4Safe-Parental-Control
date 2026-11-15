import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { sessionApi } from "../api/session.api";
import { activeMobileSessionStorage } from "../utils/activeMobileSessionStorage";

const MOBILE_BACKGROUND_LOCATION_TASK = "BloomProtect-mobile-background-location";

TaskManager.defineTask(MOBILE_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("[mobileBackgroundLocation] Task error", error);
    return;
  }

  const storedSession = await activeMobileSessionStorage.getItem();
  if (!storedSession) return;

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations || [];
  const latestLocation = locations.at(-1);
  if (!latestLocation) return;

  await sessionApi.locationRealtime(storedSession.sessionId, {
    latitude: latestLocation.coords.latitude,
    longitude: latestLocation.coords.longitude,
    accuracy: latestLocation.coords.accuracy
  }, storedSession.mobileSessionToken).catch(() => {});

  await sessionApi.heartbeat(
    storedSession.sessionId,
    60000,
    undefined,
    storedSession.mobileSessionToken,
    { appState: "background", source: "background-location" }
  ).catch(() => {});
});

async function hasStartedLocationUpdates() {
  return Location.hasStartedLocationUpdatesAsync(MOBILE_BACKGROUND_LOCATION_TASK).catch(() => false);
}

export const mobileBackgroundLocationService = {
  async start(enabled: boolean) {
    if (!enabled || Platform.OS === "web") return false;

    const foregroundPermission = await Location.getForegroundPermissionsAsync();
    if (!foregroundPermission.granted) return false;

    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    if (!backgroundPermission.granted) {
      console.warn("[mobileBackgroundLocation] Permiso de ubicacion background denegado");
      return false;
    }

    if (await hasStartedLocationUpdates()) return true;

    await Location.startLocationUpdatesAsync(MOBILE_BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      activityType: Location.ActivityType.OtherNavigation,
      deferredUpdatesDistance: 25,
      deferredUpdatesInterval: 60000,
      distanceInterval: 25,
      foregroundService: {
        notificationTitle: "Kids4Safe Auxilio activo",
        notificationBody: "Compartiendo ubicacion de emergencia en segundo plano.",
        notificationColor: "#C81E3A"
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      timeInterval: 60000
    });

    return true;
  },

  async stop() {
    if (Platform.OS === "web") return;
    if (!(await hasStartedLocationUpdates())) return;
    await Location.stopLocationUpdatesAsync(MOBILE_BACKGROUND_LOCATION_TASK).catch(() => {});
  }
};

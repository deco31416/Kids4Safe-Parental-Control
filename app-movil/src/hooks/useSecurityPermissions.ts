import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { sessionApi } from "../api/session.api";
import { bluetoothService } from "../services/bluetooth.service";
import { mobileRealtimePublisherService } from "../services/mobileRealtimePublisher.service";
import { mobileInstallationService } from "../services/mobileInstallation.service";
import { colors } from "../theme/colors";
import { defaultSecurityPermissionPreferences, securityPermissionStorage } from "../utils/securityPermissionStorage";

export type PermissionKey = "gpsAlways" | "location" | "camera" | "microphone" | "notifications" | "bluetooth" | "screen";

export type SecurityPermissionItem = {
  id: PermissionKey;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  active: boolean;
  available: boolean;
  unavailableLabel?: string;
};

const initialPermissions: SecurityPermissionItem[] = [
  {
    id: "gpsAlways",
    icon: "navigate-circle-outline",
    iconColor: "#10B981",
    iconBg: colors.gpsActiveSoft,
    title: "GPS siempre activo",
    description: Platform.OS === "web" ? "Mantiene la ubicación visible mientras esta app permanezca abierta" : "Mantiene la ubicación visible aunque Auxilio no esté activo",
    active: defaultSecurityPermissionPreferences.gpsAlways,
    available: true
  },
  {
    id: "location",
    icon: "location-outline",
    iconColor: "#3B82F6",
    iconBg: "#EEF6FF",
    title: "Ubicación Precisa",
    description: "Permite que los servicios de emergencia te localicen",
    active: defaultSecurityPermissionPreferences.location,
    available: true
  },
  {
    id: "camera",
    icon: "camera-outline",
    iconColor: "#EC4899",
    iconBg: "#F1F8FF",
    title: "Acceso a Cámaras",
    description: "Incluye cámara frontal y trasera para evidencia",
    active: defaultSecurityPermissionPreferences.camera,
    available: true
  },
  {
    id: "microphone",
    icon: "mic-outline",
    iconColor: colors.primary,
    iconBg: "#EAF4FF",
    title: "Micrófono",
    description: "Grabación de audio ambiental para documentar situaciones",
    active: defaultSecurityPermissionPreferences.microphone,
    available: true
  },
  {
    id: "notifications",
    icon: "notifications-outline",
    iconColor: colors.primary,
    iconBg: colors.inputBackground,
    title: "Notificaciones PUSH",
    description: Platform.OS === "web" ? "Las alertas PUSH del sistema estarán disponibles en la app instalada" : "Recibe alertas de seguridad en tiempo real",
    active: defaultSecurityPermissionPreferences.notifications,
    available: Platform.OS !== "web",
    unavailableLabel: Platform.OS === "web" ? "Solo móvil" : undefined
  },
  {
    id: "bluetooth",
    icon: "bluetooth-outline",
    iconColor: "#8B5CF6",
    iconBg: "#F1F0FF",
    title: "Bluetooth Cercano",
    description: "Conéctate con accesorios de seguridad externos",
    active: defaultSecurityPermissionPreferences.bluetooth,
    available: true
  },
  {
    id: "screen",
    icon: "phone-portrait-outline",
    iconColor: "#06B6D4",
    iconBg: "#ECFEFF",
    title: "Transmisión de Pantalla",
    description: "Comparte la pantalla del móvil en emergencia",
    active: defaultSecurityPermissionPreferences.screen,
    available: true
  }
];

export function useSecurityPermissions() {
  const [permissions, setPermissions] = useState(initialPermissions);

  useEffect(() => {
    const syncPermissionStatus = async () => {
      try {
        const storedPermissions = await securityPermissionStorage.getItem();
        const [location, camera, microphone, notifications] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Camera.getCameraPermissionsAsync(),
          Camera.getMicrophonePermissionsAsync(),
          Platform.OS === "web" ? Promise.resolve({ granted: false }) : Notifications.getPermissionsAsync()
        ]);

        setPermissions((currentPermissions) =>
          currentPermissions.map((permission) => {
            if (permission.id === "gpsAlways") return { ...permission, active: storedPermissions.gpsAlways && location.granted };
            if (permission.id === "location") return { ...permission, active: storedPermissions.location && location.granted };
            if (permission.id === "camera") return { ...permission, active: storedPermissions.camera && camera.granted };
            if (permission.id === "microphone") return { ...permission, active: storedPermissions.microphone && microphone.granted };
            if (permission.id === "notifications") return { ...permission, active: storedPermissions.notifications && notifications.granted };
            if (permission.id === "bluetooth") {
              const available = bluetoothService.isAvailable();
              return {
                ...permission,
                active: available && storedPermissions.bluetooth,
                available,
                unavailableLabel: available ? undefined : "No disponible"
              };
            }
            if (permission.id === "screen") {
              const available = mobileRealtimePublisherService.isScreenShareAvailable();
              return {
                ...permission,
                active: available && storedPermissions.screen && mobileRealtimePublisherService.isScreenSharePrepared(),
                available,
                unavailableLabel: available ? undefined : Platform.OS === "ios" ? "Pendiente iOS" : "No disponible"
              };
            }
            return { ...permission, active: storedPermissions[permission.id] };
          })
        );
      } catch {
        setPermissions(initialPermissions);
      }
    };

    void syncPermissionStatus();
  }, []);

  const setPermissionActive = async (id: PermissionKey, active: boolean) => {
    const storedPermissions = await securityPermissionStorage.getItem();
    if (id === "gpsAlways") {
      await mobileInstallationService.register({ requestNotificationPermission: false });
      await sessionApi.mobileUnitGpsAlwaysStatus(active);
    }
    if (id === "notifications") {
      if (active) await mobileInstallationService.register({ includeNotificationToken: true });
      else await mobileInstallationService.unregisterNotifications();
    }

    await securityPermissionStorage.setItem({
      ...storedPermissions,
      [id]: active
    });

    setPermissions((currentPermissions) => currentPermissions.map((permission) => (permission.id === id ? { ...permission, active } : permission)));
  };

  const requestPermission = async (id: PermissionKey) => {
    if (id === "gpsAlways" || id === "location") return Location.requestForegroundPermissionsAsync();
    if (id === "camera") return Camera.requestCameraPermissionsAsync();
    if (id === "microphone") return Camera.requestMicrophonePermissionsAsync();
    if (id === "notifications") {
      if (Platform.OS === "web") return { granted: false };
      return Notifications.requestPermissionsAsync();
    }
    if (id === "bluetooth") {
      const device = await bluetoothService.requestBloomBand();
      return { granted: Boolean(device.id) };
    }
    if (id === "screen") {
      return { granted: await mobileRealtimePublisherService.prepareScreenShare() };
    }
    return null;
  };

  const togglePermission = async (permission: SecurityPermissionItem) => {
    if (!permission.available) {
      return { active: false, systemHandled: true };
    }

    if (permission.active) {
      if (permission.id === "screen") {
        mobileRealtimePublisherService.stopScreenShare();
      }
      await setPermissionActive(permission.id, false);
      return { active: false, systemHandled: true };
    }

    const result = await requestPermission(permission.id);
    if (!result) {
      await setPermissionActive(permission.id, true);
      return { active: true, systemHandled: false };
    }

    await setPermissionActive(permission.id, result.granted);
    return { active: result.granted, systemHandled: true };
  };

  return { permissions, togglePermission };
}

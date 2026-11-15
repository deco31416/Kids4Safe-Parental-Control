import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type SecurityPermissionPreferences = {
  gpsAlways: boolean;
  location: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  bluetooth: boolean;
  screen: boolean;
};

const SECURITY_PERMISSION_KEY = "bloomprotect_security_permissions";
const LEGACY_SECURITY_PERMISSION_KEY = "qr_deco_security_permissions";
const listeners = new Set<(preferences: SecurityPermissionPreferences) => void>();

export const defaultSecurityPermissionPreferences: SecurityPermissionPreferences = {
  gpsAlways: false,
  location: true,
  camera: false,
  microphone: true,
  notifications: true,
  bluetooth: false,
  screen: false
};

export const securityPermissionStorage = {
  async getItem(): Promise<SecurityPermissionPreferences> {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(SECURITY_PERMISSION_KEY) ?? null : await SecureStore.getItemAsync(SECURITY_PERMISSION_KEY);
    const legacyRaw =
      !raw && Platform.OS === "web"
        ? globalThis.localStorage?.getItem(LEGACY_SECURITY_PERMISSION_KEY) ?? null
        : !raw
          ? await SecureStore.getItemAsync(LEGACY_SECURITY_PERMISSION_KEY)
          : null;

    if (legacyRaw) {
      if (Platform.OS === "web") {
        globalThis.localStorage?.setItem(SECURITY_PERMISSION_KEY, legacyRaw);
      } else {
        await SecureStore.setItemAsync(SECURITY_PERMISSION_KEY, legacyRaw);
      }
    }

    const storedValue = raw ?? legacyRaw;
    if (!storedValue) return defaultSecurityPermissionPreferences;

    try {
      return {
        ...defaultSecurityPermissionPreferences,
        ...JSON.parse(storedValue)
      };
    } catch {
      return defaultSecurityPermissionPreferences;
    }
  },

  async setItem(preferences: SecurityPermissionPreferences) {
    const value = JSON.stringify(preferences);

    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(SECURITY_PERMISSION_KEY, value);
    } else {
      await SecureStore.setItemAsync(SECURITY_PERMISSION_KEY, value);
    }

    listeners.forEach((listener) => listener(preferences));
  },

  subscribe(listener: (preferences: SecurityPermissionPreferences) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

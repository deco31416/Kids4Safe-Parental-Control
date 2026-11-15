import Constants from "expo-constants";
import { Platform } from "react-native";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:7000";

function getExpoDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return undefined;

  const host = hostUri.split(":")[0];
  return host && host !== "localhost" && host !== "127.0.0.1" ? host : undefined;
}

function resolveApiUrl() {
  if (Platform.OS === "web" || !/^http:\/\/(localhost|127\.0\.0\.1):/i.test(configuredApiUrl)) {
    return configuredApiUrl;
  }

  // Android emulators reach the development computer through this host alias.
  // Expo's LAN host still takes priority for physical devices.
  const developmentHost = getExpoDevelopmentHost() || (Platform.OS === "android" && __DEV__ ? "10.0.2.2" : undefined);
  return developmentHost
    ? configuredApiUrl.replace(/(localhost|127\.0\.0\.1)/i, developmentHost)
    : configuredApiUrl;
}

export const API_URL = resolveApiUrl();
export const REALTIME_URL = `${API_URL}/realtime`;

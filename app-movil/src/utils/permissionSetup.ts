import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { Platform } from "react-native";

export type RecommendedPermissionKey = "camera" | "location" | "microphone" | "notifications";

export const recommendedPermissionOrder: RecommendedPermissionKey[] =
  Platform.OS === "web"
    ? ["location", "camera", "microphone"]
    : ["location", "camera", "microphone", "notifications"];

export async function getMissingRecommendedPermissions() {
  const [location, camera, microphone, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Camera.getCameraPermissionsAsync(),
    Camera.getMicrophonePermissionsAsync(),
    Platform.OS === "web" ? Promise.resolve({ granted: true }) : Notifications.getPermissionsAsync()
  ]);

  const missing: RecommendedPermissionKey[] = [];
  if (!location.granted) missing.push("location");
  if (!camera.granted) missing.push("camera");
  if (!microphone.granted) missing.push("microphone");
  if (!notifications.granted && Platform.OS !== "web") missing.push("notifications");

  return missing;
}

export async function shouldShowPermissionSetup() {
  const missing = await getMissingRecommendedPermissions();
  return missing.length > 0;
}

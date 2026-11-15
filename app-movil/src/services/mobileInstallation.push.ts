import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function getProjectId() {
  return (
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

export async function getExpoNotificationToken(requestPermission = false) {
  if (Platform.OS === "web") return undefined;
  const permission = requestPermission
    ? await Notifications.requestPermissionsAsync()
    : await Notifications.getPermissionsAsync();
  const projectId = getProjectId();
  if (!permission.granted || !projectId) return undefined;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function listenForNativePushTokenChanges(onChange: () => void) {
  if (Platform.OS === "web") return () => {};
  const subscription = Notifications.addPushTokenListener(() => onChange());
  return () => subscription.remove();
}

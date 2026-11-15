import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ReactivateTarget } from "../api/session.api";
import { mobileNotificationApi } from "../api/mobileNotification.api";
import { startMobilePushPolling, stopMobilePushPolling } from "./mobilePush.polling";
import { fromNativeNotification } from "./mobilePush.protocol";
import { canAuthorizeReactivation, type MobilePushEvent, type MobilePushListener } from "./mobilePush.types";

export type { MobilePushEvent } from "./mobilePush.types";
export { canAuthorizeReactivation } from "./mobilePush.types";

const listeners = new Set<MobilePushListener>();
const seenMarks = new Set<string>();
let lastEvent: MobilePushEvent | null = null;
let cleanup: (() => void) | null = null;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
}

function emit(event: MobilePushEvent) {
  lastEvent = event;
  listeners.forEach((listener) => void listener(event));
}

async function markSeen(event: MobilePushEvent) {
  if (!event.notificationId || seenMarks.has(event.notificationId)) return;
  seenMarks.add(event.notificationId);
  await mobileNotificationApi.markSeen(event.notificationId).catch(() => {
    seenMarks.delete(event.notificationId!);
  });
}

export const mobilePushService = {
  start() {
    if (cleanup) return cleanup;
    if (Platform.OS === "web") {
      cleanup = () => {
        lastEvent = null;
        cleanup = null;
      };
      return cleanup;
    }

    const received = Notifications.addNotificationReceivedListener((notification) => {
      emit(fromNativeNotification(notification, "received"));
    });
    const response = Notifications.addNotificationResponseReceivedListener(({ notification }) => {
      const event = fromNativeNotification(notification, "response");
      void markSeen(event);
      emit(event);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const event = fromNativeNotification(response.notification, "response");
      void markSeen(event);
      emit(event);
    });

    cleanup = () => {
      received.remove();
      response.remove();
      stopMobilePushPolling();
      lastEvent = null;
      cleanup = null;
    };
    return cleanup;
  },

  startPolling(sessionId: string, token?: string, onMissing?: () => void) {
    return startMobilePushPolling(
      sessionId,
      token,
      (event) => {
        emit(event);
        if (event.requestKind !== "service_reactivation" || !event.requiresConfirmation) {
          void markSeen(event);
        }
      },
      onMissing
    );
  },

  stopPolling: stopMobilePushPolling,

  subscribe(listener: MobilePushListener) {
    listeners.add(listener);
    if (lastEvent) void listener(lastEvent);
    return () => {
      listeners.delete(listener);
    };
  },

  markSeen,

  async respond(event: MobilePushEvent, decision: "accepted" | "rejected", targets: ReactivateTarget[] = []) {
    if (!event.notificationId) throw new Error("La solicitud no tiene identificador");
    if (decision === "accepted" && !canAuthorizeReactivation(event)) {
      throw new Error("La solicitud está vencida o incompleta");
    }
    return mobileNotificationApi.respond(event.notificationId, decision, targets);
  }
};

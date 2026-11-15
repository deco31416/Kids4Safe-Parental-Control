import { sessionApi } from "../api/session.api";
import { fromPendingNotification } from "./mobilePush.protocol";
import type { MobilePushEvent } from "./mobilePush.types";

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let lastPollServerTime: string | undefined;

function getHttpStatus(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

export function stopMobilePushPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = null;
  lastPollServerTime = undefined;
}

export function startMobilePushPolling(
  sessionId: string,
  mobileSessionToken: string | undefined,
  emit: (event: MobilePushEvent) => void,
  onSessionMissing?: () => void
) {
  stopMobilePushPolling();

  const poll = async () => {
    const response = await sessionApi
      .mobilePendingNotifications(sessionId, mobileSessionToken, lastPollServerTime)
      .catch((error) => {
        if (getHttpStatus(error) === 404) {
          stopMobilePushPolling();
          onSessionMissing?.();
        }
        return null;
      });
    if (!response) return;

    lastPollServerTime = response.serverTime;
    response.notifications.forEach((notification) => emit(fromPendingNotification(notification, sessionId)));
  };

  void poll();
  pollingTimer = setInterval(() => void poll(), 5000);
  return stopMobilePushPolling;
}

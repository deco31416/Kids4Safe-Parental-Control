import type * as Notifications from "expo-notifications";
import type { MobilePendingNotification, ReactivateTarget } from "../api/session.api";
import type { MobilePushEvent, MobilePushSource } from "./mobilePush.types";

const allowedTargets = new Set<ReactivateTarget>(["camera", "microphone", "screen", "location"]);

function readBoolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function readTargets(value: unknown): ReactivateTarget[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split(",");
    }
  }

  if (!Array.isArray(parsed)) return [];
  return Array.from(new Set(parsed.filter((target): target is ReactivateTarget => allowedTargets.has(target))));
}

function readRequestKind(value: unknown): MobilePushEvent["requestKind"] {
  return value === "service_reactivation" ? value : value === "message" ? value : undefined;
}

export function fromNativeNotification(
  notification: Notifications.Notification,
  source: MobilePushSource
): MobilePushEvent {
  const data = notification.request.content.data || {};
  const notificationId = typeof data.notificationId === "string" ? data.notificationId : undefined;

  return {
    notificationId,
    requestId: typeof data.requestId === "string" ? data.requestId : notificationId,
    requestKind: readRequestKind(data.requestKind),
    requiresConfirmation: readBoolean(data.requiresConfirmation),
    expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : undefined,
    sessionId: typeof data.sessionId === "string" ? data.sessionId : undefined,
    reactivateTunnel: readBoolean(data.reactivateTunnel),
    reactivateTargets: readTargets(data.reactivateTargets),
    type: typeof data.type === "string" ? data.type : undefined,
    title: notification.request.content.title || undefined,
    body: notification.request.content.body || undefined,
    linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : undefined,
    receivedAt: Date.now(),
    source
  };
}

export function fromPendingNotification(
  notification: MobilePendingNotification,
  sessionId: string
): MobilePushEvent {
  return {
    notificationId: notification.id,
    requestId: notification.requestId || notification.id,
    requestKind: notification.requestKind,
    requiresConfirmation: Boolean(notification.requiresConfirmation),
    expiresAt: notification.expiresAt,
    sessionId,
    reactivateTunnel: notification.reactivateTunnel,
    reactivateTargets: readTargets(notification.reactivateTargets),
    type: notification.type,
    title: notification.content.title,
    body: notification.content.body || notification.content.linkText,
    linkUrl: notification.content.linkUrl,
    receivedAt: notification.timestamp ? Date.parse(notification.timestamp) : Date.now(),
    source: "poll"
  };
}

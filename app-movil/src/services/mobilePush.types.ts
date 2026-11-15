import type { ReactivateTarget } from "../api/session.api";

export type MobilePushSource = "received" | "response" | "poll";

export type MobilePushEvent = {
  notificationId?: string;
  requestId?: string;
  requestKind?: "message" | "service_reactivation";
  requiresConfirmation: boolean;
  expiresAt?: string;
  sessionId?: string;
  reactivateTunnel: boolean;
  reactivateTargets: ReactivateTarget[];
  type?: string;
  title?: string;
  body?: string;
  linkUrl?: string;
  receivedAt: number;
  source: MobilePushSource;
};

export type MobilePushListener = (event: MobilePushEvent) => void | Promise<void>;

export function canAuthorizeReactivation(event: MobilePushEvent) {
  if (
    !event.notificationId ||
    event.requestKind !== "service_reactivation" ||
    !event.requiresConfirmation ||
    !event.expiresAt ||
    event.reactivateTargets.length === 0
  ) {
    return false;
  }

  const expiresAt = Date.parse(event.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

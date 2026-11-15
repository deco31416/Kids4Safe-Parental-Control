import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { JoinSessionResponse, NativePermissionState } from "../api/session.api";

export type StoredActiveMobileSession = JoinSessionResponse & {
  qrId: string;
  permissions: NativePermissionState;
  savedAt: number;
};

const ACTIVE_MOBILE_SESSION_KEY = "bloomprotect_active_mobile_session";
const LEGACY_ACTIVE_MOBILE_SESSION_KEY = "qr_deco_active_mobile_session";
let mutations: Promise<unknown> = Promise.resolve();

function serialized<T>(action: () => Promise<T>): Promise<T> {
  const next = mutations.then(action);
  mutations = next.catch(() => {});
  return next;
}

function isStoredSession(value: unknown): value is StoredActiveMobileSession {
  const session = value as Partial<StoredActiveMobileSession> | null;
  return Boolean(
    session &&
      typeof session.sessionId === "string" &&
      typeof session.mobileSessionToken === "string" &&
      typeof session.qrId === "string" &&
      typeof session.destinationUrl === "string" &&
      typeof session.qrName === "string" &&
      typeof session.savedAt === "number" &&
      session.permissions &&
      typeof session.permissions.camera === "boolean" &&
      typeof session.permissions.microphone === "boolean" &&
      typeof session.permissions.location === "boolean" &&
      (session.permissions.backgroundLocation === undefined || typeof session.permissions.backgroundLocation === "boolean")
  );
}

async function readRaw() {
  if (Platform.OS === "web") {
    const raw = globalThis.localStorage?.getItem(ACTIVE_MOBILE_SESSION_KEY) ?? null;
    const legacyRaw = !raw ? globalThis.localStorage?.getItem(LEGACY_ACTIVE_MOBILE_SESSION_KEY) ?? null : null;
    if (legacyRaw) globalThis.localStorage?.setItem(ACTIVE_MOBILE_SESSION_KEY, legacyRaw);
    return raw ?? legacyRaw;
  }

  const raw = await SecureStore.getItemAsync(ACTIVE_MOBILE_SESSION_KEY);
  const legacyRaw = !raw ? await SecureStore.getItemAsync(LEGACY_ACTIVE_MOBILE_SESSION_KEY) : null;
  if (legacyRaw) await SecureStore.setItemAsync(ACTIVE_MOBILE_SESSION_KEY, legacyRaw);
  return raw ?? legacyRaw;
}

async function writeRaw(value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(ACTIVE_MOBILE_SESSION_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(ACTIVE_MOBILE_SESSION_KEY, value);
}

async function readSession(): Promise<StoredActiveMobileSession | null> {
  const raw = await readRaw();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function deleteRaw() {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(ACTIVE_MOBILE_SESSION_KEY);
    globalThis.localStorage?.removeItem(LEGACY_ACTIVE_MOBILE_SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(ACTIVE_MOBILE_SESSION_KEY);
    await SecureStore.deleteItemAsync(LEGACY_ACTIVE_MOBILE_SESSION_KEY);
  }
}

export const activeMobileSessionStorage = {
  getItem() { return serialized(readSession); },

  async setItem(session: Omit<StoredActiveMobileSession, "savedAt">) {
    await serialized(() => writeRaw(JSON.stringify({ ...session, savedAt: Date.now() })));
  },

  async removeItem() {
    await serialized(deleteRaw);
  },

  removeIfMatches(sessionId: string) {
    return serialized(async () => {
      if ((await readSession())?.sessionId === sessionId) await deleteRaw();
    });
  }
};

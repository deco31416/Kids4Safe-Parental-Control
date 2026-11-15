import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type PendingSessionClosure = {
  sessionId: string;
  mobileSessionToken?: string;
  requestedAt: number;
};

const KEY = "kids4safe_pending_session_closures";
let mutations: Promise<unknown> = Promise.resolve();

async function read(): Promise<PendingSessionClosure[]> {
  const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values)) throw new Error("No se pudo leer el cierre pendiente de Auxilio");
  return values.filter((value): value is PendingSessionClosure => Boolean(
    value && typeof value.sessionId === "string" && typeof value.requestedAt === "number" &&
    (value.mobileSessionToken === undefined || typeof value.mobileSessionToken === "string")
  ));
}

async function write(values: PendingSessionClosure[]) {
  if (Platform.OS === "web") {
    if (!globalThis.localStorage) throw new Error("Almacenamiento no disponible");
    if (values.length) globalThis.localStorage.setItem(KEY, JSON.stringify(values));
    else globalThis.localStorage.removeItem(KEY);
  } else if (values.length) await SecureStore.setItemAsync(KEY, JSON.stringify(values));
  else await SecureStore.deleteItemAsync(KEY);
}

function mutate(action: () => Promise<void>) {
  const next = mutations.then(action);
  mutations = next.catch(() => {});
  return next;
}

export const pendingSessionClosuresStorage = {
  getItems: read,
  add(entry: PendingSessionClosure) {
    return mutate(async () => {
      const entries = await read();
      await write([...entries.filter((value) => value.sessionId !== entry.sessionId), entry]);
    });
  },
  remove(sessionId: string) {
    return mutate(async () => write((await read()).filter((value) => value.sessionId !== sessionId)));
  }
};

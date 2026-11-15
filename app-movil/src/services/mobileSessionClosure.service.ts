import { sessionApi } from "../api/session.api";
import { activeMobileSessionStorage } from "../utils/activeMobileSessionStorage";
import { getHttpStatus } from "../utils/httpStatus";
import { pendingSessionClosuresStorage, type PendingSessionClosure } from "../utils/pendingSessionClosuresStorage";

let flushInFlight: Promise<{ pending: number; confirmed: number }> | null = null;

async function clearCheckpoint(sessionId: string) {
  await activeMobileSessionStorage.removeIfMatches(sessionId);
}

async function confirm(entry: PendingSessionClosure) {
  try {
    await sessionApi.end(entry.sessionId, entry.mobileSessionToken);
    return true;
  } catch (error) {
    return [404, 410].includes(getHttpStatus(error) || 0);
  }
}

export const mobileSessionClosureService = {
  async hasPending(sessionId: string) {
    return (await pendingSessionClosuresStorage.getItems()).some((entry) => entry.sessionId === sessionId);
  },
  async request(sessionId: string, mobileSessionToken?: string) {
    const entry = { sessionId, mobileSessionToken, requestedAt: Date.now() };
    let persisted = false;
    try {
      await pendingSessionClosuresStorage.add(entry);
      persisted = true;
    } catch {
      // Even if local storage fails, try to close the remote session now.
    }
    if (persisted) await clearCheckpoint(sessionId);
    if (await confirm(entry)) {
      await clearCheckpoint(sessionId);
      await pendingSessionClosuresStorage.remove(sessionId);
    } else if (!persisted) {
      throw new Error("No se pudo confirmar ni guardar el cierre de Auxilio. Intenta detenerlo de nuevo.");
    }
    return { pendingClosure: (await pendingSessionClosuresStorage.getItems()).length > 0 };
  },
  flush() {
    if (!flushInFlight) {
      flushInFlight = (async () => {
        let confirmed = 0;
        for (const entry of await pendingSessionClosuresStorage.getItems()) {
          if (await confirm(entry)) {
            await clearCheckpoint(entry.sessionId);
            await pendingSessionClosuresStorage.remove(entry.sessionId);
            confirmed += 1;
          }
        }
        return { pending: (await pendingSessionClosuresStorage.getItems()).length, confirmed };
      })().finally(() => { flushInFlight = null; });
    }
    return flushInFlight;
  }
};

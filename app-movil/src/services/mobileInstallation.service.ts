import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiClient } from "../api/client";
import { mobileUnitStorage } from "../utils/mobileUnitStorage";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";
import { getExpoNotificationToken, listenForNativePushTokenChanges } from "./mobileInstallation.push";
import { mobileInstallationStatus } from "./mobileInstallation.status";

type RegisterResult = {
  registered: boolean;
  unitId: string;
  unitToken?: string | null;
};

let registerInFlight: Promise<RegisterResult> | null = null;

function summarizeError(error: unknown) {
  if (!error || typeof error !== "object") return String(error);
  const maybeAxiosError = error as {
    message?: string;
    response?: { status?: number; data?: { message?: string } | string };
    code?: string;
  };

  return {
    code: maybeAxiosError.code,
    message: maybeAxiosError.message,
    status: maybeAxiosError.response?.status,
    backendMessage:
      typeof maybeAxiosError.response?.data === "string"
        ? maybeAxiosError.response.data
        : maybeAxiosError.response?.data?.message
  };
}

function isUnauthorizedUnitRegistration(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 401
  );
}

async function clearMobileUnitIdentity() {
  await Promise.all([
    mobileUnitStorage.deleteItem(),
    mobileUnitTokenStorage.deleteItem()
  ]);
}

async function registerInternal(
  options?: { includeNotificationToken?: boolean; requestNotificationPermission?: boolean },
  retryOnUnauthorized = true
): Promise<RegisterResult> {
  const mobileUnitId = await mobileUnitStorage.getOrCreate();
  const unitToken = await mobileUnitTokenStorage.getItem();
  let notificationToken: string | undefined;

  if (Platform.OS !== "web" && options?.includeNotificationToken !== false) {
    try {
      notificationToken = await getExpoNotificationToken(options?.requestNotificationPermission);
    } catch (error) {
      console.warn("[mobileInstallation] Token push no disponible; registro continua sin notificaciones", summarizeError(error));
    }
  }

  let data: {
    registered: boolean;
    unitId: string;
    unitToken?: string;
  };

  try {
    const response = await apiClient.post<typeof data>("/mobile/units/register", {
      mobileUnitId,
      deviceLabel: "Kids4Safe Mobile",
      appVersion: Constants.expoConfig?.version,
      platform: Platform.OS,
      notificationProvider: notificationToken ? "expo" : undefined,
      notificationToken
    }, {
      headers: unitToken ? { "X-Mobile-Unit-Token": unitToken } : undefined
    });

    data = response.data;
  } catch (error) {
    if (retryOnUnauthorized && isUnauthorizedUnitRegistration(error)) {
      await clearMobileUnitIdentity();
      return registerInternal(options, false);
    }

    throw error;
  }

  const effectiveUnitToken = data.unitToken || unitToken;
  if (data.unitToken) await mobileUnitTokenStorage.setItem(data.unitToken);
  mobileInstallationStatus.set({
    lastError: undefined,
    lastRegisteredAt: Date.now(),
    notificationConfigured: Boolean(notificationToken),
    registered: true
  });
  return {
    ...data,
    unitToken: effectiveUnitToken
  };
}

export const mobileInstallationService = {
  async register(options?: { includeNotificationToken?: boolean; requestNotificationPermission?: boolean }) {
    if (!registerInFlight) {
      registerInFlight = registerInternal(options)
        .catch((error) => {
          mobileInstallationStatus.set({
            lastError: error instanceof Error ? error.message : "No se pudo registrar la unidad",
            registered: false
          });
          throw error;
        })
        .finally(() => {
          registerInFlight = null;
        });
    }

    return registerInFlight;
  },

  getStatus() {
    return mobileInstallationStatus.get();
  },

  startTokenRefreshListener() {
    return listenForNativePushTokenChanges(() => {
      void this.register({ includeNotificationToken: true }).catch((error) => {
        console.warn("[mobileInstallation] No se pudo actualizar el token PUSH", summarizeError(error));
      });
    });
  },

  async unregisterNotifications() {
    const unitId = await mobileUnitStorage.getOrCreate();
    const unitToken = await mobileUnitTokenStorage.getItem();
    if (!unitToken) return;
    await apiClient.delete(`/mobile/units/${encodeURIComponent(unitId)}/notifications/token`, {
      headers: { "X-Mobile-Unit-Token": unitToken }
    });
    mobileInstallationStatus.set({ notificationConfigured: false });
  }
};

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const MOBILE_UNIT_KEY = "bloomprotect_mobile_unit_id";
const LEGACY_MOBILE_UNIT_KEY = "qr_deco_mobile_unit_id";
const MOBILE_UNIT_PATTERN = /^mobile-[a-zA-Z0-9-]{8,80}$/;

function createUnitId() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return `mobile-${cryptoApi.randomUUID()}`;
  }

  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const mobileUnitStorage = {
  async getOrCreate(): Promise<string> {
    const existing = Platform.OS === "web" ? globalThis.localStorage?.getItem(MOBILE_UNIT_KEY) ?? null : await SecureStore.getItemAsync(MOBILE_UNIT_KEY);
    const legacyExisting =
      !existing && Platform.OS === "web"
        ? globalThis.localStorage?.getItem(LEGACY_MOBILE_UNIT_KEY) ?? null
        : !existing
          ? await SecureStore.getItemAsync(LEGACY_MOBILE_UNIT_KEY)
          : null;

    if (legacyExisting && MOBILE_UNIT_PATTERN.test(legacyExisting)) {
      if (Platform.OS === "web") {
        globalThis.localStorage?.setItem(MOBILE_UNIT_KEY, legacyExisting);
      } else {
        await SecureStore.setItemAsync(MOBILE_UNIT_KEY, legacyExisting);
      }
      return legacyExisting;
    }

    if (existing && MOBILE_UNIT_PATTERN.test(existing)) return existing;

    const unitId = createUnitId();

    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(MOBILE_UNIT_KEY, unitId);
      return unitId;
    }

    await SecureStore.setItemAsync(MOBILE_UNIT_KEY, unitId);
    return unitId;
  },

  async deleteItem(): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(MOBILE_UNIT_KEY);
      globalThis.localStorage?.removeItem(LEGACY_MOBILE_UNIT_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(MOBILE_UNIT_KEY);
    await SecureStore.deleteItemAsync(LEGACY_MOBILE_UNIT_KEY);
  }
};

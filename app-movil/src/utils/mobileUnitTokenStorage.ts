import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const MOBILE_UNIT_TOKEN_KEY = "bloomprotect_mobile_unit_token";
const LEGACY_MOBILE_UNIT_TOKEN_KEY = "qr_deco_mobile_unit_token";

export const mobileUnitTokenStorage = {
  async getItem() {
    if (Platform.OS === "web") {
      const token = globalThis.localStorage?.getItem(MOBILE_UNIT_TOKEN_KEY) ?? null;
      const legacyToken = !token ? globalThis.localStorage?.getItem(LEGACY_MOBILE_UNIT_TOKEN_KEY) ?? null : null;
      if (legacyToken) globalThis.localStorage?.setItem(MOBILE_UNIT_TOKEN_KEY, legacyToken);
      return token ?? legacyToken;
    }

    const token = await SecureStore.getItemAsync(MOBILE_UNIT_TOKEN_KEY);
    const legacyToken = !token ? await SecureStore.getItemAsync(LEGACY_MOBILE_UNIT_TOKEN_KEY) : null;
    if (legacyToken) await SecureStore.setItemAsync(MOBILE_UNIT_TOKEN_KEY, legacyToken);
    return token ?? legacyToken;
  },

  async setItem(token: string) {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(MOBILE_UNIT_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(MOBILE_UNIT_TOKEN_KEY, token);
  },

  async deleteItem() {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(MOBILE_UNIT_TOKEN_KEY);
      globalThis.localStorage?.removeItem(LEGACY_MOBILE_UNIT_TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(MOBILE_UNIT_TOKEN_KEY);
    await SecureStore.deleteItemAsync(LEGACY_MOBILE_UNIT_TOKEN_KEY);
  }
};

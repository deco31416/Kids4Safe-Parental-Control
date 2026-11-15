import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const ACCESS_TOKEN_KEY = "bloomprotect_access_token";
const LEGACY_ACCESS_TOKEN_KEY = "qr_deco_access_token";

export const tokenStorage = {
  async getItem() {
    if (Platform.OS === "web") {
      const token = globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null;
      const legacyToken = !token ? globalThis.localStorage?.getItem(LEGACY_ACCESS_TOKEN_KEY) ?? null : null;
      if (legacyToken) globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, legacyToken);
      return token ?? legacyToken;
    }

    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const legacyToken = !token ? await SecureStore.getItemAsync(LEGACY_ACCESS_TOKEN_KEY) : null;
    if (legacyToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyToken);
    return token ?? legacyToken;
  },

  async setItem(accessToken: string) {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, accessToken);
      return;
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  },

  async deleteItem() {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
      globalThis.localStorage?.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY);
  }
};

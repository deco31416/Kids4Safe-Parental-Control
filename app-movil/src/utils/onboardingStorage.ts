import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ONBOARDING_COMPLETED_KEY = "bloomprotect_onboarding_completed";

export const onboardingStorage = {
  async getCompleted() {
    const value =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(ONBOARDING_COMPLETED_KEY) ?? null
        : await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);

    return value === "true";
  },

  async setCompleted() {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(ONBOARDING_COMPLETED_KEY, "true");
      return;
    }

    await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
  }
};

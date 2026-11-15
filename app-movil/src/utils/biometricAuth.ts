import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_LOGIN_KEY = "bloomprotect_biometric_login_enabled";

export const biometricAuth = {
  async isSupported() {
    if (Platform.OS === "web") return false;

    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync()
    ]);

    return hasHardware && isEnrolled;
  },

  async isEnabled() {
    if (Platform.OS === "web") return false;
    return (await SecureStore.getItemAsync(BIOMETRIC_LOGIN_KEY)) === "true";
  },

  async setEnabled(enabled: boolean) {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(BIOMETRIC_LOGIN_KEY, enabled ? "true" : "false");
  },

  async authenticate(reason = "Confirma tu identidad para entrar a Kids4Safe") {
    if (!(await this.isSupported())) return false;

    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
      fallbackLabel: "Usar clave del dispositivo",
      promptMessage: reason
    });

    return result.success;
  }
};

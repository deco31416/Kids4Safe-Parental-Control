import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts
} from "@expo-google-fonts/plus-jakarta-sans";
import { colors } from "../src/theme/colors";
import { useAuthStore } from "../src/store/auth.store";
import { ToastProvider } from "../src/components/ui";
import { mobilePushService } from "../src/services/mobilePush.service";
import { EmergencySessionProvider } from "../src/contexts/EmergencySessionContext";
import { mobileInstallationService } from "../src/services/mobileInstallation.service";
import { SessionReconnectScreen } from "../src/components/auth/SessionReconnectScreen";

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const sessionUnavailable = useAuthStore((state) => state.sessionUnavailable);
  const isLoading = useAuthStore((state) => state.isLoading);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!sessionUnavailable || !accessToken) return;
    const retry = () => { if (AppState.currentState === "active") void refreshMe(); };
    const timer = setInterval(retry, 15000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") retry(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [sessionUnavailable, accessToken, refreshMe]);

  useEffect(() => {
    if (!user) return;
    return mobilePushService.start();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void mobileInstallationService.register({ includeNotificationToken: true }).catch((error) => {
      console.warn("[mobileInstallation] No se pudo registrar la instalación", error);
    });
    return mobileInstallationService.startTokenRefreshListener();
  }, [user]);

  if (isBootstrapping || !fontsLoaded) {
    return (
      <View style={styles.boot}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ToastProvider>
      <EmergencySessionProvider>
        <StatusBar style="dark" />
        {sessionUnavailable && accessToken && !user ? (
          <SessionReconnectScreen retrying={isLoading} onRetry={() => void refreshMe()} />
        ) : <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerShown: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: "800" }
          }}
        >
          <Stack.Screen name="index" options={{ title: "Kids4Safe" }} />
          <Stack.Screen name="onboarding" options={{ title: "Bienvenida" }} />
          <Stack.Screen name="login" options={{ title: "Iniciar sesion" }} />
          <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
          <Stack.Screen name="reset-password" options={{ title: "Recuperar contrasena" }} />
          <Stack.Screen name="permissions-setup" options={{ title: "Permisos" }} />
          <Stack.Screen name="terms" options={{ title: "Terminos" }} />
          <Stack.Screen name="generate" options={{ title: "Kids4Safe" }} />
          <Stack.Screen name="history" options={{ title: "Actividad" }} />
          <Stack.Screen name="profile" options={{ title: "Perfil" }} />
          <Stack.Screen name="security" options={{ title: "Permisos" }} />
        </Stack>}
      </EmergencySessionProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    alignItems: "center",
    backgroundColor: colors.homeBackground,
    flex: 1,
    justifyContent: "center"
  }
});

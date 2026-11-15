import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { AuthFooterLink, AuthForm, AuthHeader } from "../src/components/auth";
import { AuthScenery } from "../src/components/auth/AuthScenery";
import { AppScreen } from "../src/components/layout";
import { useToast } from "../src/components/ui";
import { useAuthStore } from "../src/store/auth.store";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { biometricAuth } from "../src/utils/biometricAuth";
import { shouldShowPermissionSetup } from "../src/utils/permissionSetup";
import { tokenStorage } from "../src/utils/tokenStorage";
import { isRequired } from "../src/utils/validators";

function getLoginErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "No pudimos iniciar sesión";
  const maybeAxiosError = error as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { message?: string } | string };
  };
  const status = maybeAxiosError.response?.status;

  console.warn("[Login] Inicio de sesión falló", {
    code: maybeAxiosError.code,
    message: maybeAxiosError.message,
    status,
    backendMessage:
      typeof maybeAxiosError.response?.data === "string"
        ? maybeAxiosError.response.data
        : maybeAxiosError.response?.data?.message
  });

  if (status === 401) return "Credenciales incorrectas";
  if (status === 404) return "Servicio de autenticación no disponible";
  if (status && status >= 500) return "El servidor no pudo iniciar sesión";
  if (!status) return "No hay conexión con el servidor";

  return "No pudimos iniciar sesión";
}

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    async function checkBiometric() {
      const enabled = await biometricAuth.isEnabled();
      const supported = await biometricAuth.isSupported();
      const hasToken = Boolean(await tokenStorage.getItem());
      if (mounted) setBiometricAvailable(enabled && supported && hasToken);
    }

    void checkBiometric();
    return () => {
      mounted = false;
    };
  }, []);

  const emailError = submitted && !isRequired(email) ? "Ingresa tu usuario o email." : undefined;
  const passwordError = submitted && !isRequired(password) ? "Ingresa tu contrasena." : undefined;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isRequired(email) || !isRequired(password)) return;

    try {
      await login({ email: email.trim(), password });
      router.replace((await shouldShowPermissionSetup()) ? "/permissions-setup" : "/");
    } catch (error) {
      showToast({ message: getLoginErrorMessage(error), type: "error" });
    }
  };

  const fields = [
    {
      key: "email",
      label: "Correo electrónico",
      value: email,
      placeholder: "correo@ejemplo.com",
      error: emailError,
      keyboardType: "email-address" as const,
      autoCapitalize: "none" as const,
      onChangeText: setEmail
    },
    {
      key: "password",
      label: "Contraseña",
      value: password,
      placeholder: "Tu contraseña",
      error: passwordError,
      secureTextEntry: true,
      onChangeText: setPassword
    }
  ];

  return (
    <AppScreen light>
      <AuthHeader title="Bienvenido" subtitle="Entra con tu cuenta para proteger a tu familia y tu dispositivo." />
      {biometricAvailable ? (
        <Pressable
          onPress={async () => {
            const accepted = await biometricAuth.authenticate();
            if (!accepted) return;
            try {
              await refreshMe();
              router.replace((await shouldShowPermissionSetup()) ? "/permissions-setup" : "/");
            } catch {
              showToast({ message: "Vuelve a iniciar sesion con tu contrasena", type: "error" });
              setBiometricAvailable(false);
            }
          }}
          style={({ pressed }) => [styles.biometricButton, pressed && styles.pressed]}
        >
          <Text style={styles.biometricText}>Entrar con huella, rostro o clave del dispositivo</Text>
        </Pressable>
      ) : null}
      <AuthForm fields={fields} isLoading={isLoading} onSubmit={handleSubmit} submitLabel="Iniciar sesión"
        footer={<Pressable accessibilityRole="link" onPress={() => router.push("/reset-password")} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
        </Pressable>} />
      <AuthFooterLink action="Crear cuenta" href="/register" label="¿Aún no tienes cuenta?" />
      <AuthScenery />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  forgotLink: {
    alignItems: "center",
    paddingVertical: 4
  },
  forgotText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: "800"
  },
  biometricButton: {
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  biometricText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.82
  }
});

import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthForm, AuthHeader } from "../src/components/auth";
import { AppScreen } from "../src/components/layout";
import { useToast } from "../src/components/ui";
import { useAuthStore } from "../src/store/auth.store";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";
import { isEmail, hasMinLength, isRequired } from "../src/utils/validators";

export default function ResetPasswordScreen() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();

  const emailError = submitted && !isEmail(email) ? "Ingresa un email valido." : undefined;
  const tokenError = submitted && !isRequired(resetToken) ? "Ingresa el codigo de recuperacion." : undefined;
  const passwordError = submitted && !hasMinLength(newPassword, 8) ? "Usa minimo 8 caracteres." : undefined;

  const handleRequest = async () => {
    setSubmitted(true);
    if (!isEmail(email)) return;

    try {
      const result = await forgotPassword({ email: email.trim() });
      setDevToken(result.resetToken);
      if (result.resetToken) setResetToken(result.resetToken);
      showToast({ message: "Solicitud de recuperacion creada", type: "success" });
    } catch {
      showToast({ message: "No pudimos crear la solicitud", type: "error" });
    }
  };

  const handleReset = async () => {
    setSubmitted(true);
    if (!isEmail(email) || !isRequired(resetToken) || !hasMinLength(newPassword, 8)) return;

    try {
      await resetPassword({ email: email.trim(), newPassword, resetToken: resetToken.trim() });
      showToast({ message: "Contrasena actualizada", type: "success" });
      router.replace("/login");
    } catch {
      showToast({ message: "No pudimos cambiar la contrasena", type: "error" });
    }
  };

  const requestFields = [
    {
      key: "email",
      label: "Email",
      value: email,
      placeholder: "correo@ejemplo.com",
      error: emailError,
      keyboardType: "email-address" as const,
      autoCapitalize: "none" as const,
      onChangeText: setEmail
    }
  ];

  const resetFields = [
    {
      key: "token",
      label: "Codigo de recuperacion",
      value: resetToken,
      placeholder: "Pega aqui el codigo",
      error: tokenError,
      autoCapitalize: "none" as const,
      onChangeText: setResetToken
    },
    {
      key: "password",
      label: "Nueva contrasena",
      value: newPassword,
      placeholder: "Minimo 8 caracteres",
      error: passwordError,
      secureTextEntry: true,
      onChangeText: setNewPassword
    }
  ];

  return (
    <AppScreen light>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons color={colors.onPrimary} name="arrow-back-outline" size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Recuperar contrasena</Text>
      </View>
      <AuthHeader title="Recuperar acceso" subtitle="Solicita un codigo y crea una nueva contrasena para tu cuenta Kids4Safe." />
      <AuthForm fields={requestFields} isLoading={isLoading} onSubmit={handleRequest} submitLabel="Solicitar codigo" />
      {devToken ? (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Codigo local de desarrollo</Text>
          <Text selectable style={styles.devToken}>{devToken}</Text>
        </View>
      ) : null}
      <AuthForm fields={resetFields} isLoading={isLoading} onSubmit={handleReset} submitLabel="Cambiar contrasena" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  devBox: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  devTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: "800"
  },
  devToken: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.82
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  topTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 18
  }
});

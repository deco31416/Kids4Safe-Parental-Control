import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthFooterLink, AuthForm, AuthHeader } from "../src/components/auth";
import { AppScreen } from "../src/components/layout";
import { useToast } from "../src/components/ui";
import { useAuthStore } from "../src/store/auth.store";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { hasMinLength, isEmail, isRequired } from "../src/utils/validators";

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const nameError = submitted && !isRequired(fullName) ? "Ingresa tu nombre completo." : undefined;
  const emailError = submitted && !isEmail(email) ? "Ingresa un email valido." : undefined;
  const passwordError = submitted && !hasMinLength(password, 8) ? "Usa minimo 8 caracteres." : undefined;
  const termsError = submitted && !acceptedTerms ? "Debes aceptar terminos y privacidad." : undefined;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isRequired(fullName) || !isEmail(email) || !hasMinLength(password, 8) || !acceptedTerms) return;

    try {
      await register({ acceptedTerms, email: email.trim(), fullName: fullName.trim(), password, phone: phone.trim() });
      router.replace("/permissions-setup");
    } catch {
      showToast({ message: "No pudimos crear la cuenta", type: "error" });
    }
  };

  const fields = [
    { key: "name", label: "Nombre completo", value: fullName, placeholder: "Tu nombre", error: nameError, onChangeText: setFullName },
    {
      key: "email",
      label: "Email",
      value: email,
      placeholder: "correo@empresa.com",
      error: emailError,
      keyboardType: "email-address" as const,
      autoCapitalize: "none" as const,
      onChangeText: setEmail
    },
    {
      key: "phone",
      label: "Telefono",
      value: phone,
      placeholder: "+52 300 000 0000",
      keyboardType: "phone-pad" as const,
      onChangeText: setPhone
    },
    {
      key: "password",
      label: "Contrasena",
      value: password,
      placeholder: "Minimo 8 caracteres",
      error: passwordError,
      secureTextEntry: true,
      onChangeText: setPassword
    }
  ];

  return (
    <AppScreen light>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons color={colors.onPrimary} name="arrow-back-outline" size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Crear cuenta</Text>
      </View>
      <AuthHeader title="Crear cuenta Kids4Safe" subtitle="Tu cuenta queda vinculada a esta unidad movil para emergencias y perfil medico." />
      <AuthForm fields={fields} isLoading={isLoading} onSubmit={handleSubmit} submitLabel="Crear cuenta" />
      <View style={styles.termsWrapper}>
        <Pressable onPress={() => setAcceptedTerms((value) => !value)} style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
          <Text style={styles.checkboxMark}>{acceptedTerms ? "OK" : ""}</Text>
        </Pressable>
        <Text style={styles.termsText}>
          Acepto los{" "}
          <Text onPress={() => router.push("/terms")} style={styles.termsLink}>
            terminos, privacidad, consentimiento de permisos y supervision familiar autorizada
          </Text>
          .
        </Text>
      </View>
      {termsError ? <Text style={styles.termsError}>{termsError}</Text> : null}
      <AuthFooterLink action="Iniciar sesion" href="/login" label="Ya tienes cuenta?" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  checkboxActive: {
    backgroundColor: colors.primary
  },
  checkboxMark: {
    color: colors.onPrimary,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    fontWeight: "900"
  },
  termsWrapper: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8
  },
  termsText: {
    color: colors.homeMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontWeight: "900"
  },
  termsError: {
    color: colors.danger,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8
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
  },
  pressed: {
    opacity: 0.82
  }
});

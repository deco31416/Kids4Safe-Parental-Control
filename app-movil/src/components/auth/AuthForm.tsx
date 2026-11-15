import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

type AuthField = {
  key: string; label: string; value: string; placeholder: string; error?: string; secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (value: string) => void;
};
type AuthFormProps = {
  fields: AuthField[]; submitLabel: string; isLoading?: boolean; onSubmit: () => void; footer?: ReactNode;
};
function Field({ field, disabled }: { field: AuthField; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const { key, label, error, secureTextEntry, ...input } = field;
  const icon = secureTextEntry ? "lock-closed-outline" : key.toLowerCase().includes("email") ? "mail-outline" : "person-outline";
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Ionicons color={colors.primaryDark} name={icon} size={20} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={[styles.inputRow, focused && styles.inputFocused, error ? styles.inputError : undefined]}>
        <TextInput accessibilityLabel={label} accessibilityHint={error} editable={!disabled}
          placeholderTextColor={colors.homeMuted} selectionColor={colors.primary} style={styles.input}
          {...input} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} underlineColorAndroid="transparent" secureTextEntry={secureTextEntry && !visible} />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"} disabled={disabled} hitSlop={4} onPress={() => setVisible(!visible)} style={styles.inputAction}>
            <Ionicons name={visible ? "eye-outline" : "eye-off-outline"} color={colors.homeMuted} size={21} />
          </Pressable>
        ) : field.value.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={"Borrar " + label.toLowerCase()} disabled={disabled} hitSlop={4} onPress={() => field.onChangeText("")} style={styles.inputAction}>
            <Ionicons name="close-circle" color={colors.homeMuted} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}
export function AuthForm({ fields, submitLabel, isLoading, onSubmit, footer }: AuthFormProps) {
  return (
    <View style={styles.card}>
      {fields.map((field) => <Field key={field.key} field={field} disabled={isLoading} />)}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(isLoading), busy: Boolean(isLoading) }} disabled={isLoading} onPress={onSubmit} style={({ pressed }) => [styles.button, pressed && styles.pressed, isLoading && styles.disabled]}>
        <LinearGradient colors={gradients.button} start={{ x: 0, y: 0.32 }} end={{ x: 1, y: 0.68 }} style={styles.gradient}>
          {isLoading ? <ActivityIndicator color={colors.onPrimary} /> : <>
            <Text style={styles.buttonText}>{submitLabel}</Text>
            <View style={styles.arrow}><Ionicons color={colors.onPrimary} name="arrow-forward" size={23} /></View>
          </>}
        </LinearGradient>
      </Pressable>
      {footer}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { alignSelf: "center", backgroundColor: colors.homeSurface, borderColor: colors.homeBorder, borderRadius: 28, borderWidth: 1, gap: 20, maxWidth: 450, padding: 22, shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, width: "100%" },
  field: { gap: 9 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { color: colors.homeText, fontFamily: fonts.medium, fontSize: 14 },
  inputRow: { backgroundColor: colors.inputBackground, borderColor: colors.homeBorder, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "stretch", minHeight: 58 },
  inputFocused: { backgroundColor: colors.homeSurface, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  input: { backgroundColor: "transparent", borderRadius: 16, borderWidth: 0, outlineStyle: "solid", outlineWidth: 0, color: colors.homeText, flex: 1, minWidth: 0, minHeight: 56, fontFamily: fonts.medium, fontSize: 15, paddingHorizontal: 16, paddingVertical: 16 },
  inputAction: { padding: 12, minHeight: 46, minWidth: 44, alignItems: "center", justifyContent: "center" },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12 },
  button: { borderRadius: 99, overflow: "hidden", marginTop: 2 },
  gradient: { minHeight: 58, alignItems: "center", justifyContent: "center", paddingHorizontal: 52, paddingVertical: 12 },
  buttonText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 17, textAlign: "center" },
  arrow: { position: "absolute", right: 9, backgroundColor: colors.secondary, borderRadius: 24, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.84 }, disabled: { opacity: 0.62 }
});

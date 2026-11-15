import type { ComponentProps } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";

type AppButtonProps = Omit<ComponentProps<typeof Pressable>, "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, variant = "primary", loading, disabled, style, ...props }: AppButtonProps) {
  const textStyle = variant === "primary" ? styles.primaryText : variant === "secondary" ? styles.secondaryText : styles.ghostText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}
      {...props}
    >
      {variant === "primary" ? <LinearGradient pointerEvents="none" colors={gradients.button} start={{ x: 0, y: 0.32 }} end={{ x: 1, y: 0.68 }} style={StyleSheet.absoluteFill} /> : null}
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.onPrimary : colors.action} /> : <Text style={[styles.text, textStyle]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.pill,
    minHeight: 54,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  primary: { backgroundColor: colors.action },
  secondary: { backgroundColor: colors.actionSoft, borderColor: colors.action, borderWidth: 1 },
  ghost: { backgroundColor: "transparent" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: "800" },
  primaryText: { color: colors.onPrimary },
  secondaryText: { color: colors.action },
  ghostText: { color: colors.action }
});

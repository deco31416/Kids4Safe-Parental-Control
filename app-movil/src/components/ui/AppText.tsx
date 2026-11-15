import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

type AppTextProps = PropsWithChildren<TextProps & {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  tone?: "primary" | "secondary" | "muted" | "action" | "success" | "danger";
}>;

export function AppText({ children, variant = "body", tone = "primary", style, ...props }: AppTextProps) {
  return (
    <Text style={[styles.base, styles[variant], styles[tone], style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontFamily: fonts.regular, letterSpacing: 0 },
  title: { fontFamily: fonts.extraBold, fontSize: 30, lineHeight: 36 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0, textTransform: "uppercase" },
  primary: { color: colors.text },
  secondary: { color: colors.textSecondary },
  muted: { color: colors.textMuted },
  action: { color: colors.action },
  success: { color: colors.success },
  danger: { color: colors.danger }
});

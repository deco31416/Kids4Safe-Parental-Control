import { useState, type ComponentProps } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppText } from "./AppText";

type AppInputProps = ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
};

export function AppInput({ label, error, style, onFocus, onBlur, ...props }: AppInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <TextInput placeholderTextColor={colors.textMuted} selectionColor={colors.action} underlineColorAndroid="transparent" style={[styles.input, focused && styles.focused, error && styles.errorBorder, style]} {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }} />
      {error ? <AppText tone="danger" variant="caption">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    minHeight: 58,
    width: "100%",
    outlineStyle: "solid",
    outlineWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  focused: { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  errorBorder: { borderColor: colors.danger }
});

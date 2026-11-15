import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type ProfileValueBoxProps = {
  value: string;
  onChangeText?: (value: string) => void;
  keyboardType?: "default" | "phone-pad";
  placeholder?: string;
  accessibilityLabel?: string;
};

export function ProfileValueBox({ value, onChangeText, keyboardType = "default", placeholder, accessibilityLabel }: ProfileValueBoxProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
      <TextInput
        accessibilityLabel={accessibilityLabel}
        cursorColor={colors.secondary}
        keyboardType={keyboardType}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.homeMuted}
        selectionColor={colors.secondary}
        style={[styles.box, isFocused && styles.boxFocused]}
        underlineColorAndroid="transparent"
        value={value}
      />
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 58,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 16,
    outlineStyle: "solid",
    outlineWidth: 0,
    color: colors.homeText,
    fontFamily: fonts.medium,
    fontSize: 16,
    textAlignVertical: "center",
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16
  },
  boxFocused: {
    backgroundColor: colors.homeSurface,
    borderColor: colors.primary,
    shadowOpacity: 0.12
  }
});

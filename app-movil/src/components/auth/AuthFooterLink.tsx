import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";

type AuthFooterLinkProps = {
  label: string;
  action: string;
  href: Href;
};

export function AuthFooterLink({ label, action, href }: AuthFooterLinkProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.label}>{label}</Text>
      <Link href={href} asChild>
        <Pressable style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <Text style={styles.linkText}>{action}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    gap: spacing.sm
  },
  label: {
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 13
  },
  linkButton: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 13
  },
  linkText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 14
  },
  pressed: {
    opacity: 0.82
  }
});

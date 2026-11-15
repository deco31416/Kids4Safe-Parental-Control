import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppText } from "../ui";

type IconName = ComponentProps<typeof Ionicons>["name"];

type QRActionCardProps = {
  href: Href;
  icon: IconName;
  title: string;
  subtitle: string;
};

export function QRActionCard({ href, icon, title, subtitle }: QRActionCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.icon}>
          <Ionicons color={colors.action} name={icon} size={23} />
        </View>
        <View style={styles.copy}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText tone="secondary" variant="caption">{subtitle}</AppText>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  pressed: { opacity: 0.8 },
  icon: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  copy: { flex: 1, gap: spacing.xs },
  title: { fontSize: 16, fontWeight: "900" }
});

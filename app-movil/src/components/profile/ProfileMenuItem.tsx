import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppText } from "../ui";

type IconName = ComponentProps<typeof Ionicons>["name"];

type ProfileMenuItemProps = {
  icon: IconName;
  title: string;
  subtitle: string;
};

export function ProfileMenuItem({ icon, title, subtitle }: ProfileMenuItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.icon}>
        <Ionicons color={colors.action} name={icon} size={22} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText tone="secondary" variant="caption">{subtitle}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  copy: { flex: 1, gap: spacing.xs },
  title: { fontSize: 15, fontWeight: "900" }
});

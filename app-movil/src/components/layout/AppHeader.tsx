import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppIconButton, AppText } from "../ui";
import { Kids4SafeShield } from "../brand/Kids4SafeBrand";

type IconName = ComponentProps<typeof Ionicons>["name"];

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  rightIcon?: IconName;
  onRightPress?: () => void;
};

export function AppHeader({ title, subtitle, rightIcon, onRightPress }: AppHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Kids4SafeShield size={42} />
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText tone="secondary" variant="caption">{subtitle}</AppText> : null}
      </View>
      {rightIcon ? <AppIconButton icon={rightIcon} onPress={onRightPress} /> : <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  logo: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  copy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "900" },
  spacer: { width: 42 }
});

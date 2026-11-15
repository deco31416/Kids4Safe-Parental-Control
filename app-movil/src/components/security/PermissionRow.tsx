import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";
import { PermissionSwitch } from "./PermissionSwitch";

type IconName = ComponentProps<typeof Ionicons>["name"];

type PermissionRowProps = {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  active?: boolean;
  available?: boolean;
  unavailableLabel?: string;
  onToggle?: () => void;
};

export function PermissionRow({ icon, title, description, active, available = true, unavailableLabel, onToggle }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
          <Ionicons color={colors.onPrimary} name={icon} size={22} />
        </LinearGradient>
        <Text style={styles.title}>
          {title}
        </Text>
        <PermissionSwitch label={title} active={active} disabled={!available} disabledLabel={unavailableLabel} onToggle={onToggle} />
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.98)",
    borderRadius: 26,
    borderWidth: 2,
    gap: 10,
    padding: 16,
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 18
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  title: {
    color: colors.homeText,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  description: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19
  }
});

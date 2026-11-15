import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

type IconName = ComponentProps<typeof Ionicons>["name"];

type ProfileInfoCardProps = {
  icon: IconName;
  label: string;
  children: ReactNode;
};

export function ProfileInfoCard({ icon, label, children }: ProfileInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
          <Ionicons color={colors.onPrimary} name={icon} size={20} />
        </LinearGradient>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    borderWidth: 2,
    gap: 14,
    padding: 18,
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 22
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  icon: { alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12 },
  label: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 15,
    flex: 1,
    fontWeight: "700"
  },
  content: {
    gap: 12
  }
});

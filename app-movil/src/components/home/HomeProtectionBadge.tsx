import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type HomeProtectionBadgeProps = {
  compact?: boolean;
  emergency?: boolean;
  tiny?: boolean;
  pending?: boolean;
};

export function HomeProtectionBadge({ compact, emergency, tiny, pending }: HomeProtectionBadgeProps) {
  return (
    <LinearGradient colors={emergency ? ["#FFF3F2", "#FFE0E0"] : pending ? ["#FFFAEF", "#FFF1CD"] : ["rgba(239,255,255,0.92)", "rgba(196,248,252,0.75)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.badge, compact && styles.compact, tiny && styles.tiny, emergency && styles.emergency]}>
      <Ionicons name={emergency ? "alert-circle" : pending ? "cloud-offline-outline" : "shield-checkmark"} size={24} color={emergency ? colors.danger : pending ? "#946000" : "#00B99A"} />
      <Text style={[styles.text, emergency && styles.textEmergency, pending && styles.textPending]}>
        {emergency ? "AUXILIO ACTIVO" : pending ? "CIERRE PENDIENTE" : "PROTECCIÓN ACTIVA"}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.homeSurface,
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  compact: {
    paddingHorizontal: 26,
    paddingVertical: 10
  },
  tiny: {
    paddingHorizontal: 22,
    paddingVertical: 8
  },
  emergency: {
    backgroundColor: "#FEECEC",
    borderColor: "#FCA5A5"
  },
  text: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1
  },
  textEmergency: {
    color: "#DC2626"
  },
  textPending: { color: "#946000" }
});

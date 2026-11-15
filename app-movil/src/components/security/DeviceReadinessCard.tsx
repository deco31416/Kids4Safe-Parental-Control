import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDeviceReadiness } from "../../hooks/useDeviceReadiness";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

export function DeviceReadinessCard() {
  const { checking, readiness, verify } = useDeviceReadiness();
  const checks = [
    readiness.apiConfigured,
    readiness.unitRegistered,
    readiness.notifications,
    readiness.pushRegistered,
    readiness.camera,
    readiness.microphone,
    readiness.location
  ];
  const ready = checks.every(Boolean);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TU PROTECCIÓN</Text>
          <Text style={styles.title}>{ready ? "Listo para emergencias" : "Requiere atención"}</Text>
        </View>
        <View style={[styles.statusIcon, { backgroundColor: ready ? colors.gpsActiveSoft : "#FFF4DF" }]}>
          <Ionicons color={ready ? "#16834B" : "#A76208"} name={ready ? "shield-checkmark" : "warning-outline"} size={24} />
        </View>
      </View>
      <Text style={styles.description}>Revisa que todo esté listo para pedir ayuda.</Text>
      {readiness.error ? <Text style={styles.error}>No pudimos completar la revisión. Comprueba tu conexión e inténtalo de nuevo.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: checking, busy: checking }} disabled={checking} onPress={() => void verify()} style={({ pressed }) => [styles.button, (checking || pressed) && styles.disabled]}>
        <Ionicons name="refresh-outline" size={17} color={colors.primary} />
        <Text style={styles.buttonText}>{checking ? "Verificando…" : "Verificar nuevamente"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.98)", borderRadius: radius.xl, borderWidth: 2, padding: 18 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  headerCopy: { flex: 1 },
  statusIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  eyebrow: { color: colors.primary, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
  title: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 18, lineHeight: 25, marginTop: 5 },
  description: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, marginTop: 12 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, marginTop: 12 },
  button: { alignItems: "center", flexDirection: "row", gap: 8, backgroundColor: colors.inputBackground, borderColor: colors.homeBorder, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center", marginTop: 14, minHeight: 46, paddingHorizontal: 10 },
  buttonText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12 },
  disabled: { opacity: 0.6 }
});

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeBottomNav } from "../src/components/home";
import { AppScrollView } from "../src/components/layout";
import { useEmergencySession } from "../src/contexts/EmergencySessionContext";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";

export default function HistoryScreen() {
  const { activeSession, currentAddress, gpsActive, isEmergencyActive } = useEmergencySession();

  const rows = [
    {
      icon: "shield-checkmark-outline" as const,
      label: "Protección",
      value: isEmergencyActive ? "Auxilio activo" : "En espera",
      active: isEmergencyActive
    },
    {
      icon: "location-outline" as const,
      label: "Ubicación",
      value: gpsActive ? currentAddress || "Ubicación detectada" : "GPS desactivado",
      active: gpsActive
    },
    {
      icon: "radio-outline" as const,
      label: "Sesión",
      value: activeSession?.sessionId ? `${activeSession.sessionId.slice(0, 8)}...` : "Sin transmisión activa",
      active: Boolean(activeSession)
    }
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Ionicons color={colors.homeSurface} name="time-outline" size={22} />
        </View>
        <Text style={styles.topTitle}>Actividad</Text>
        <View style={styles.placeholder} />
      </View>

      <AppScrollView light>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.kicker}>KIDS4SAFE</Text>
            <Text style={styles.title}>Estado reciente de protección</Text>
            <Text style={styles.subtitle}>
              Aquí verás el estado actual de la unidad, la ubicación disponible y la transmisión activa cuando se inicia Auxilio.
            </Text>
          </View>

          <View style={styles.list}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <View style={[styles.rowIcon, row.active && styles.rowIconActive]}>
                  <Ionicons color={row.active ? colors.homeSurface : colors.primary} name={row.icon} size={22} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text numberOfLines={2} style={styles.rowValue}>
                    {row.value}
                  </Text>
                </View>
                <View style={[styles.statusPill, row.active ? styles.statusOn : styles.statusOff]}>
                  <Text style={[styles.statusText, row.active ? styles.statusTextOn : styles.statusTextOff]}>
                    {row.active ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </AppScrollView>

      <HomeBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.homeBackground,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    flexDirection: "row",
    height: 70,
    justifyContent: "space-between",
    paddingHorizontal: 24
  },
  logo: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  topTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 19,
    fontWeight: "700"
  },
  placeholder: {
    width: 32
  },
  content: {
    gap: 22,
    paddingBottom: 42,
    paddingHorizontal: 18,
    paddingTop: 22
  },
  heroCard: {
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 22
  },
  kicker: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  subtitle: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21
  },
  list: {
    gap: 14
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 14
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  rowIconActive: {
    backgroundColor: colors.primary
  },
  rowCopy: {
    flex: 1,
    gap: 4
  },
  rowLabel: {
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 12
  },
  rowValue: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: "800"
  },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusOn: {
    backgroundColor: colors.gpsActiveSoft,
    borderColor: colors.gpsActive
  },
  statusOff: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.homeBorder
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: "800"
  },
  statusTextOn: {
    color: colors.gpsActive
  },
  statusTextOff: {
    color: colors.homeMuted
  }
});

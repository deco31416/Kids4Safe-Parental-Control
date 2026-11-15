import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type HomeRecentActivityProps = {
  gpsActive?: boolean;
  address?: string;
};

export function HomeRecentActivity({ gpsActive = false, address }: HomeRecentActivityProps) {
  const locationText = gpsActive ? address || "Ubicación detectada" : "GPS desactivado";

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons color="#1265C8" name="location-outline" size={23} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>UBICACIÓN ACTUAL</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.title}>
          {locationText}
        </Text>
      </View>
      <View style={[styles.pill, gpsActive ? styles.pillActive : styles.pillInactive]}>
        <Text style={[styles.pillText, gpsActive ? styles.pillTextActive : styles.pillTextInactive]}>
          {gpsActive ? "GPS OK" : "GPS OFF"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "center",
    width: "90%",
    maxWidth: 540,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 22
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  copy: {
    flex: 1,
    gap: 3
  },
  label: {
    color: "#66758F",
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4
  },
  title: {
    color: "#0B2454",
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: "800"
  },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
    marginLeft: "auto",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  pillActive: {
    backgroundColor: colors.gpsActiveSoft,
    borderColor: colors.gpsActive
  },
  pillInactive: {
    backgroundColor: colors.gpsInactiveSoft,
    borderColor: colors.gpsInactive
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: "800"
  },
  pillTextActive: {
    color: colors.gpsActive
  },
  pillTextInactive: {
    color: colors.gpsInactive
  }
});

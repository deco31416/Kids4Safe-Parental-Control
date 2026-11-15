import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

export function SecurityIntroCard() {
  return (
    <LinearGradient colors={["rgba(255,255,255,0.96)", "rgba(223,248,252,0.78)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.header}>
        <LinearGradient colors={gradients.brand} style={styles.icon}>
          <Ionicons color={colors.onPrimary} name="shield-checkmark-outline" size={27} />
        </LinearGradient>
        <Text style={styles.eyebrow}>SEGURIDAD Y PERMISOS</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Tu seguridad es prioridad</Text>
        <Text style={styles.text}>
          Kids4Safe necesita estos accesos para garantizar una respuesta rápida en emergencias. Tus datos están cifrados y solo se usan para tu protección.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: "rgba(255,255,255,0.98)",
    borderWidth: 2,
    borderRadius: 32,
    gap: 16,
    padding: 20
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, flex: 1 },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  copy: {
    gap: 8
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700"
  },
  text: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21
  }
});

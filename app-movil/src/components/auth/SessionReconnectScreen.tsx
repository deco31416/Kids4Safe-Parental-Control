import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Kids4SafeBrand } from "../brand/Kids4SafeBrand";
import { HomeBackdrop } from "../home/HomeBackdrop";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

export function SessionReconnectScreen({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <View style={styles.screen}>
      <HomeBackdrop />
      <View style={styles.card}>
        <Kids4SafeBrand size={27} />
        <Ionicons accessible={false} name="cloud-offline-outline" size={46} color={colors.primary} />
        <Text style={styles.title}>Tu sesión está guardada</Text>
        <Text style={styles.copy}>No pudimos conectar con Kids4Safe. Volveremos a intentarlo automáticamente para que puedas continuar.</Text>
        <Pressable accessibilityRole="button" disabled={retrying} onPress={onRetry} style={styles.button}>
          <LinearGradient colors={gradients.button} style={styles.gradient}>
            {retrying ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Reintentar conexión</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, alignItems: "center", gap: 22, padding: 24, borderRadius: 30, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.8)" },
  title: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 21, textAlign: "center" },
  copy: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, textAlign: "center" },
  button: { width: "100%", overflow: "hidden", borderRadius: 24 },
  gradient: { minHeight: 52, alignItems: "center", justifyContent: "center", padding: 12 },
  buttonText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 14 }
});

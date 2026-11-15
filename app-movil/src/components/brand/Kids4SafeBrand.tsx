import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

export function Kids4SafeShield({ size = 80 }: { size?: number }) {
  return <Image accessible={false} source={require("../../../public/brand/favicon.png")} style={{ width: size, height: size }} resizeMode="contain" />;
}

export function Kids4SafeBrand({ stacked = false, size = 26 }: { stacked?: boolean; size?: number }) {
  if (stacked) return <Image accessibilityLabel="Kids4Safe" source={require("../../../public/brand/logo.png")} style={{ width: 185, height: 185 }} resizeMode="contain" />;
  return (
    <View accessible accessibilityLabel="Kids4Safe" style={styles.brand}>
      <Kids4SafeShield size={34} />
      <Text style={[styles.wordmark, { fontSize: size }]}>Kids<Text style={styles.four}>4</Text>Safe</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  wordmark: { color: colors.primaryDark, fontFamily: fonts.extraBold, letterSpacing: -1 },
  four: { color: colors.accent }
});

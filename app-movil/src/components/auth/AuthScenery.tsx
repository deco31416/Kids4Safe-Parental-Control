import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

export function AuthScenery() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.promise}>Tecnología que cuida lo que más importa</Text>
      <Image accessible={false} source={require("../../../public/brand/family-landscape.png")} style={[styles.illustration, { height: Math.min(width / 3, 280) }]} resizeMode="cover" />
      <View style={styles.footer}>
        <Text style={styles.caption}>FAMILIAS SEGURAS <Text style={styles.dot}> • </Text> FUTUROS BRILLANTES</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { marginHorizontal: -22, marginBottom: -22, marginTop: 4 },
  promise: { color: colors.homeMuted, fontFamily: fonts.medium, fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  illustration: { width: "100%" },
  footer: { backgroundColor: colors.homeSurface, paddingVertical: 16, paddingHorizontal: 12 },
  caption: { color: colors.homeMuted, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.6, textAlign: "center" },
  dot: { color: colors.accent }
});

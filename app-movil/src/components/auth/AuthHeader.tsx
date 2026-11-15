import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { Kids4SafeBrand } from "../brand/Kids4SafeBrand";
import { AppText } from "../ui";

type AuthHeaderProps = { title: string; subtitle: string };
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Kids4SafeBrand stacked />
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 10, paddingTop: 8, width: "100%" },
  title: { color: colors.homeText, fontFamily: fonts.extraBold, fontSize: 29, fontWeight: "900", lineHeight: 38, textAlign: "center" },
  subtitle: { color: colors.homeMuted, fontSize: 15, lineHeight: 23, maxWidth: 340, textAlign: "center" }
});

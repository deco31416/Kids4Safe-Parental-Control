import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

export const mobilePushModalStyles = StyleSheet.create({
  overlay: { alignItems: "center", backgroundColor: "rgba(22, 17, 34, 0.45)", flex: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.homeSurface, borderColor: colors.homeBorder, borderRadius: radius.xl, borderWidth: 1, maxWidth: 420, padding: 22, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  iconHalo: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  closeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12, marginBottom: 8, textTransform: "uppercase" },
  title: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 22, marginBottom: 8 },
  body: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  detail: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19, marginTop: 12 },
  notice: { backgroundColor: "#FFF7ED", borderRadius: radius.md, color: colors.homeText, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 12, padding: 12 },
  actions: { gap: 10, marginTop: 22 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  alertButton: { backgroundColor: colors.danger },
  primaryText: { color: colors.homeSurface, fontFamily: fonts.bold, fontSize: 15 },
  secondaryButton: { alignItems: "center", borderColor: colors.homeBorder, borderRadius: radius.lg, borderWidth: 1, justifyContent: "center", minHeight: 46 },
  secondaryText: { color: colors.homeMuted, fontFamily: fonts.bold, fontSize: 15 }
});

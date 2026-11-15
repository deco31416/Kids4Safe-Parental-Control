import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { shadows } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { AppBadge, AppCard, AppText } from "../ui";

type QRPreviewCardProps = {
  title?: string;
  value?: string;
};

export function QRPreviewCard({ title, value }: QRPreviewCardProps) {
  return (
    <AppCard elevated style={styles.card}>
      <View style={styles.preview}>
        <Ionicons color={colors.onPrimary} name="qr-code" size={86} />
      </View>
      <View style={styles.copy}>
        <AppBadge label={value ? "Listo para backend" : "Estado vacio"} tone="action" />
        <AppText style={styles.title}>{title || "Vista previa Kids4Safe"}</AppText>
        <AppText numberOfLines={2} tone="secondary">{value || "Ingresa un texto o enlace para preparar el codigo."}</AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  preview: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.action,
    borderRadius: radius.xl,
    height: 150,
    justifyContent: "center",
    width: 150,
    ...shadows.action
  },
  copy: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 20, fontWeight: "900", textAlign: "center" }
});

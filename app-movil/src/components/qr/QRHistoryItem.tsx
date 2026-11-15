import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import type { QRCodeItem } from "../../types/qr.types";
import { AppText } from "../ui";

type QRHistoryItemProps = {
  item: QRCodeItem;
};

export function QRHistoryItem({ item }: QRHistoryItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.icon}>
        <Ionicons color={colors.action} name="qr-code-outline" size={22} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>{item.title}</AppText>
        <AppText numberOfLines={1} tone="secondary" variant="caption">{item.value}</AppText>
      </View>
      <AppText tone="muted" variant="caption">{item.scans ?? 0} scans</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  copy: { flex: 1 },
  title: { fontSize: 15, fontWeight: "900" }
});

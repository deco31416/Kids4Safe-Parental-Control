import { StyleSheet, View } from "react-native";
import { AppCard, AppText } from "../ui";
import { spacing } from "../../theme/spacing";

type QRStatsCardProps = {
  label: string;
  value: string;
};

export function QRStatsCard({ label, value }: QRStatsCardProps) {
  return (
    <AppCard style={styles.card}>
      <AppText tone="secondary" variant="caption">{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: spacing.xs },
  value: { fontSize: 22, fontWeight: "900" }
});

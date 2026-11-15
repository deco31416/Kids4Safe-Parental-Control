import { StyleSheet, View } from "react-native";
import { QRStatsCard } from "../qr";
import { spacing } from "../../theme/spacing";

type ProfileStatsProps = {
  hasToken: boolean;
};

export function ProfileStats({ hasToken }: ProfileStatsProps) {
  return (
    <View style={styles.row}>
      <QRStatsCard label="Token" value={hasToken ? "Seguro" : "No"} />
      <QRStatsCard label="Build" value="EAS" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md
  }
});

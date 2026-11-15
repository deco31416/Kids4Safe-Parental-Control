import { StyleSheet, View } from "react-native";
import { QRStatsCard } from "../qr";
import { spacing } from "../../theme/spacing";

type HomeStatsProps = {
  activeSession: boolean;
};

export function HomeStats({ activeSession }: HomeStatsProps) {
  return (
    <View style={styles.row}>
      <QRStatsCard label="Sesion" value={activeSession ? "Activa" : "Invitada"} />
      <QRStatsCard label="Modo" value="Movil" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md
  }
});

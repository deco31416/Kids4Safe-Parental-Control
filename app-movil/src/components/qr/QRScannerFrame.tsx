import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppText } from "../ui";

type QRScannerFrameProps = {
  label: string;
};

export function QRScannerFrame({ label }: QRScannerFrameProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.frame} />
      <View style={styles.pill}>
        <AppText style={styles.text}>{label}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  frame: {
    borderColor: colors.action,
    borderRadius: radius.xl,
    borderWidth: 4,
    height: 238,
    width: 238
  },
  pill: {
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  text: { fontSize: 13, fontWeight: "800" }
});

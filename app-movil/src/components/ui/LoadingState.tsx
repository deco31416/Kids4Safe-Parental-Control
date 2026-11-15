import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { AppText } from "./AppText";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Cargando..." }: LoadingStateProps) {
  return (
    <View style={styles.wrapper}>
      <ActivityIndicator color={colors.action} />
      <AppText tone="secondary" variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg
  }
});

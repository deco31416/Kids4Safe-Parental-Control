import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { shadows } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";

type AppCardProps = PropsWithChildren<ViewProps & {
  padded?: boolean;
  elevated?: boolean;
}>;

export function AppCard({ children, padded = true, elevated, style, ...props }: AppCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, elevated && shadows.soft, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1
  },
  padded: {
    padding: spacing.md
  }
});

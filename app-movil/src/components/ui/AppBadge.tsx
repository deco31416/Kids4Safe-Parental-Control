import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import { AppText } from "./AppText";

type AppBadgeProps = {
  label: string;
  tone?: "action" | "success" | "neutral";
};

export function AppBadge({ label, tone = "neutral" }: AppBadgeProps) {
  return (
    <View style={[styles.badge, tone === "action" && styles.action, tone === "success" && styles.success]}>
      <AppText tone={tone === "success" ? "success" : tone === "action" ? "action" : "secondary"} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  action: { backgroundColor: colors.actionSoft },
  success: { backgroundColor: colors.successSoft }
});

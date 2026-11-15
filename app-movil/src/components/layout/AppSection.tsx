import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme/spacing";
import { AppText } from "../ui";

type AppSectionProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
}>;

export function AppSection({ title, subtitle, children }: AppSectionProps) {
  return (
    <View style={styles.section}>
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? <AppText style={styles.title}>{title}</AppText> : null}
          {subtitle ? <AppText tone="secondary" variant="caption">{subtitle}</AppText> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { gap: spacing.xs },
  title: { fontSize: 17, fontWeight: "900" }
});

import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme/spacing";
import { colors } from "../../theme/colors";
import { SafeContainer } from "./SafeContainer";

type AppScreenProps = PropsWithChildren<{
  light?: boolean;
  scroll?: boolean;
}>;

export function AppScreen({ children, light, scroll = true }: AppScreenProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeContainer light={light}>
      {light ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.topGlow} /><View style={styles.sideGlow} />
      </View> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  topGlow: { position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: colors.inputBackground, top: -160, right: -130 },
  sideGlow: { position: "absolute", width: 270, height: 500, borderRadius: 220, backgroundColor: colors.inputBackground, top: 180, left: -220 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.screen
  }
});

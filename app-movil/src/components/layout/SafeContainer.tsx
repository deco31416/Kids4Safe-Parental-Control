import type { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

type SafeContainerProps = PropsWithChildren<{
  light?: boolean;
}>;

export function SafeContainer({ children, light }: SafeContainerProps) {
  return <SafeAreaView style={[styles.safe, light && styles.light]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1
  },
  light: {
    backgroundColor: colors.homeBackground
  }
});

import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type AppScrollViewProps = PropsWithChildren<{
  light?: boolean;
}>;

export function AppScrollView({ children }: AppScrollViewProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: "relative"
  },
  content: {
    flexGrow: 1
  }
});

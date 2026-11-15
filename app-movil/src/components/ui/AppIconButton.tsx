import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";

type IconName = ComponentProps<typeof Ionicons>["name"];

type AppIconButtonProps = Omit<ComponentProps<typeof Pressable>, "style"> & {
  icon: IconName;
  tone?: "action" | "neutral";
  style?: StyleProp<ViewStyle>;
};

export function AppIconButton({ icon, tone = "neutral", style, ...props }: AppIconButtonProps) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, tone === "action" && styles.action, pressed && styles.pressed, style]} {...props}>
      <Ionicons color={tone === "action" ? colors.action : colors.text} name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  action: { backgroundColor: colors.actionSoft },
  pressed: { opacity: 0.78 }
});

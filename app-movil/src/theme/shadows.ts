import type { ViewStyle } from "react-native";

export const shadows = {
  soft: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8
  } satisfies ViewStyle,
  action: {
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 10
  } satisfies ViewStyle
};

import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type BloomBandButtonProps = {
  compact?: boolean;
  tiny?: boolean;
  onPress?: () => void;
};

export function BloomBandButton({ compact, tiny, onPress }: BloomBandButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Vincular localizador" onPress={onPress} style={({ pressed }) => [styles.cta, compact && styles.compact, tiny && styles.tiny, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.primary} name="locate-outline" size={18} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.text}>
        Vincular localizador
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    alignItems: "center",
    backgroundColor: "rgba(234,244,255,0.7)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 22,
    position: "relative",
    width: "100%"
  },
  compact: {
    minHeight: 50,
    paddingHorizontal: 18
  },
  tiny: {
    minHeight: 48,
    paddingHorizontal: 16
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  text: {
    color: "#1265C8",
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.82
  }
});

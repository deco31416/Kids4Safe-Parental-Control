import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

type BloodTypeSelectorProps = {
  selected?: string;
  onSelect?: (value: string) => void;
};

export function BloodTypeSelector({ selected = "O+", onSelect }: BloodTypeSelectorProps) {
  return (
    <View style={styles.grid}>
      {bloodTypes.map((type) => {
        const active = type === selected;
        return (
          <Pressable accessibilityRole="button" accessibilityLabel={`Grupo sanguíneo ${type}`} accessibilityState={{ selected: active }} key={type} onPress={() => onSelect?.(type)} style={({ pressed }) => [styles.chip, active && styles.active, pressed && styles.pressed]}>
            {active ? <LinearGradient pointerEvents="none" colors={gradients.button} style={StyleSheet.absoluteFill} /> : null}
            <Text style={[styles.text, active && styles.activeText]}>{type}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderColor: "#D5E6F8",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    height: 48,
    justifyContent: "center",
    minWidth: 48,
    flexBasis: "22%",
    flexGrow: 1,
    paddingHorizontal: 8
  },
  active: {
    backgroundColor: "#1265C8",
    borderColor: "#1265C8"
  },
  pressed: { opacity: 0.8 },
  text: {
    color: colors.homeMuted,
    fontFamily: fonts.bold,
    fontSize: 15
  },
  activeText: {
    color: colors.onPrimary
  }
});

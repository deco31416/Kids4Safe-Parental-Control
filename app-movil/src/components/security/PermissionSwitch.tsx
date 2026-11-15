import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type PermissionSwitchProps = {
  active?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  onToggle?: () => void;
  label?: string;
};

export function PermissionSwitch({ active, disabled, disabledLabel, onToggle, label = "permiso" }: PermissionSwitchProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel={`${active ? "Desactivar" : "Activar"} ${label}`}
        accessibilityRole="switch"
        accessibilityState={{ checked: Boolean(active), disabled }}
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [styles.track, active ? styles.trackOn : styles.trackOff, pressed && styles.pressed, disabled && styles.disabled]}
      >
        {active ? <LinearGradient pointerEvents="none" colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.trackGradient]} /> : null}
        <View style={[styles.thumb, active ? styles.thumbOn : styles.thumbOff]} />
      </Pressable>
      <Text style={[styles.label, active ? styles.labelOn : styles.labelOff]}>
        {disabled ? disabledLabel || "No disponible" : active ? "Activo" : "Inactivo"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 5,
    width: 62
  },
  track: {
    borderRadius: radius.pill,
    height: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 54
  },
  trackGradient: { borderRadius: radius.pill },
  pressed: {
    transform: [{ scale: 0.97 }]
  },
  disabled: {
    opacity: 0.58
  },
  trackOn: {
    alignItems: "flex-end",
    backgroundColor: colors.primary
  },
  trackOff: {
    alignItems: "flex-start",
    backgroundColor: "#C1D2E5"
  },
  thumb: {
    backgroundColor: colors.homeSurface,
    borderRadius: radius.pill,
    height: 22,
    width: 22
  },
  thumbOn: {
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4
  },
  thumbOff: {
    shadowColor: "#7B8491",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 9,
    textAlign: "center"
  },
  labelOn: {
    color: colors.primary
  },
  labelOff: {
    color: colors.homeMuted
  }
});

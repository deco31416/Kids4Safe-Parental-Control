import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

/** Decorative layers stay behind the controls and never capture a touch. */
export function HomeBackdrop() {
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#FAFDFF", "#EAF5FF", "#DFF1FF"]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(198,234,255,0.72)", "rgba(234,246,255,0)"]} style={styles.topLeft} />
      <LinearGradient colors={["rgba(187,225,255,0.52)", "rgba(233,247,255,0)"]} style={styles.topRight} />
      <LinearGradient colors={["rgba(148,213,255,0.32)", "rgba(242,250,255,0.08)"]} style={styles.leftWave} />
      <LinearGradient colors={["rgba(255,255,255,0.04)", "rgba(156,218,255,0.42)"]} style={styles.bottomWave} />
    </View>
  );
}

const styles = StyleSheet.create({
  topLeft: { position: "absolute", top: -230, left: -220, width: 510, height: 440, borderRadius: 250, transform: [{ rotate: "-24deg" }] },
  topRight: { position: "absolute", top: 100, right: -270, width: 440, height: 520, borderRadius: 260, transform: [{ rotate: "30deg" }] },
  leftWave: { position: "absolute", bottom: -20, left: -270, width: 590, height: 340, borderRadius: 260, transform: [{ rotate: "34deg" }] },
  bottomWave: { position: "absolute", bottom: -200, right: -200, width: 780, height: 390, borderRadius: 390, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)", transform: [{ rotate: "-15deg" }] }
});

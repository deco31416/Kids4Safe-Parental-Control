import { StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

export const auxilioButtonStyles = StyleSheet.create({
  touchTarget: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    padding: 24
  },
  haloOuter: {
    position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(150,223,255,0.16)",
    borderColor: "rgba(255,255,255,0.8)",
    borderWidth: 2,
    borderRadius: radius.pill
  },
  haloInner: {
    position: "absolute", top: 10, bottom: 10, left: 10, right: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(95,209,255,0.16)"
  },
  haloEmergency: { backgroundColor: "rgba(239,68,68,0.10)" },
  shell: {
    backgroundColor: "#1265C8",
    borderColor: "#0B2454",
    borderRadius: radius.pill,
    borderWidth: 3,
    padding: 5,
    height: 250,
    shadowColor: "#168FE0",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    width: 250
  },
  compact: {
    height: 218,
    width: 218
  },
  tiny: {
    height: 184,
    width: 184
  },
  emergencyShell: {
    backgroundColor: "#B91C1C",
    borderColor: "#DC2626",
    shadowColor: "#EF4444"
  },
  face: {
    alignItems: "center",
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  gloss: {
    position: "absolute", top: "3%", left: "3%",
    width: "84%", height: "61%", borderRadius: radius.pill,
    transform: [{ rotate: "-28deg" }]
  },
  faceRim: {
    position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
    borderRadius: radius.pill, borderWidth: 3,
    borderTopColor: "rgba(226,255,255,0.95)",
    borderLeftColor: "rgba(76,221,255,0.8)",
    borderBottomColor: "rgba(0,181,255,0.9)",
    borderRightColor: "rgba(9,98,218,0.6)"
  },
  holdTrack: {
    borderColor: "rgba(37, 211, 102, 0.22)",
    borderRadius: radius.pill,
    borderWidth: 6,
    bottom: -13,
    left: -13,
    position: "absolute",
    right: -13,
    top: -13,
    zIndex: 8
  },
  holdRing: {
    borderBottomColor: "transparent",
    borderRadius: radius.pill,
    borderRightColor: "transparent",
    borderWidth: 6,
    bottom: -13,
    left: -13,
    position: "absolute",
    right: -13,
    top: -13,
    zIndex: 9
  },
  waveOne: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: radius.pill,
    bottom: -18,
    left: -18,
    position: "absolute",
    right: -18,
    top: -18
  },
  waveTwo: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: radius.pill,
    bottom: -34,
    left: -34,
    position: "absolute",
    right: -34,
    top: -34
  },
  shade: {
    bottom: 0,
    height: 145,
    left: 0,
    position: "absolute",
    right: 0
  },
  text: {
    color: colors.onPrimary,
    fontFamily: fonts.extraBold,
    fontSize: 48,
    fontWeight: "900",
    textShadowColor: "rgba(0,48,119,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    zIndex: 5
  },
  textCompact: {
    fontSize: 43
  },
  textTiny: {
    fontSize: 36
  },
  activatingText: {
    fontSize: 38
  },
  pressed: {
    opacity: 0.82
  },
  disabled: {
    opacity: 0.72
  }
});

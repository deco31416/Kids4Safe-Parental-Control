import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Text, Vibration, View } from "react-native";
import { useHoldToActivate } from "../../hooks/useHoldToActivate";
import { auxilioButtonStyles as styles } from "./AuxilioButton.styles";

type AuxilioButtonProps = {
  activationMode?: "hold" | "tap";
  compact?: boolean;
  isActivating?: boolean;
  isEmergencyActive?: boolean;
  onComplete?: () => void;
  tiny?: boolean;
  diameter?: number;
};

export function AuxilioButton({ activationMode = "hold", compact, isActivating, isEmergencyActive, onComplete, tiny, diameter }: AuxilioButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const { cancel, isHolding, progress, start } = useHoldToActivate({
    disabled: isActivating || activationMode === "tap",
    onComplete
  });
  const ringColor = progress < 45 ? "#25D366" : progress < 80 ? "#168FE0" : "#EF4444";
  const spinStyle = { transform: [{ rotate: `${progress * 7.2}deg` }] };
  const label = isActivating
    ? isEmergencyActive
      ? "Deteniendo"
      : "Activando"
    : isHolding
      ? `${progress}%`
      : isEmergencyActive
        ? "Detener"
        : "Auxilio";

  return (
    <View
      accessibilityHint={activationMode === "hold" ? "Mantén presionado durante tres segundos" : "Abre la confirmación para detener el auxilio"}
      accessibilityLabel={isEmergencyActive ? "Detener señal de auxilio" : "Activar señal de auxilio"}
      accessibilityRole="button"
      accessibilityState={{ busy: Boolean(isActivating), disabled: Boolean(isActivating) }}
      onResponderGrant={() => {
        if (isActivating) return;
        setIsPressed(true);
        Vibration.vibrate(15);
        if (activationMode === "hold") start();
      }}
      onResponderRelease={() => {
        setIsPressed(false);
        if (activationMode === "tap") onComplete?.();
        else cancel();
      }}
      onResponderTerminate={() => {
        setIsPressed(false);
        cancel();
      }}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => !isActivating}
      style={styles.touchTarget}
    >
      <View pointerEvents="none" style={[styles.haloOuter, isEmergencyActive && styles.haloEmergency]} />
      <View pointerEvents="none" style={styles.haloInner} />
      <LinearGradient
        colors={isEmergencyActive ? ["#FFAAA5", "#E44049", "#A71F32"] : ["#138FFF", "#0054D0", "#00296F"]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        pointerEvents="none"
        style={[
          styles.shell,
          compact && styles.compact,
          tiny && styles.tiny,
          diameter !== undefined && { width: diameter, height: diameter },
          isEmergencyActive && styles.emergencyShell,
          isPressed && !isActivating && styles.pressed,
          isActivating && styles.disabled
        ]}
      >
        {isHolding ? (
          <>
            <View style={styles.holdTrack} />
            <View style={[styles.holdRing, { borderLeftColor: ringColor, borderTopColor: ringColor }, spinStyle]} />
          </>
        ) : null}
        {isEmergencyActive ? <EmergencyWaves /> : null}
        <LinearGradient
          colors={isEmergencyActive ? ["#FF8A80", "#EF4444", "#A71935"] : ["#27D3FF", "#0789F8", "#075ACB", "#073987"]}
          locations={isEmergencyActive ? [0, 0.5, 1] : [0, 0.28, 0.65, 1]}
          end={{ x: 0.8, y: 1 }}
          start={{ x: 0.18, y: 0 }}
          style={styles.face}
        >
          <LinearGradient colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.gloss} />
          <LinearGradient colors={["rgba(255, 255, 255, 0)", "rgba(11, 36, 84, 0.18)"]} style={styles.shade} />
          <View style={styles.faceRim} />
          <Text style={[styles.text, compact && styles.textCompact, tiny && styles.textTiny, diameter !== undefined && { fontSize: diameter * 0.177 }, (isActivating || isHolding) && styles.activatingText]}>
            {label}
          </Text>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

function EmergencyWaves() {
  return (
    <>
      <View style={styles.waveOne} />
      <View style={styles.waveTwo} />
    </>
  );
}

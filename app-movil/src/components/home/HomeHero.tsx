import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { colors } from "../../theme/colors";
import { AuxilioButton } from "./AuxilioButton";
import { BloomBandButton } from "./BloomBandButton";
import { HomeProtectionBadge } from "./HomeProtectionBadge";

type HomeHeroProps = {
  onBandPress?: () => void;
  onPrimaryPress?: () => void;
  isEmergencyActive?: boolean;
  isActivating?: boolean;
  isClosurePending?: boolean;
};

export function HomeHero({ onBandPress, onPrimaryPress, isEmergencyActive, isActivating, isClosurePending }: HomeHeroProps) {
  const { width } = useWindowDimensions();
  const tiny = width <= 330;
  const compact = width <= 360;
  const showEmergency = Boolean(isEmergencyActive);
  const diameter = Math.min(316, Math.max(196, width * 0.69));

  return (
    <View style={[styles.hero, tiny && styles.heroTiny]}>
      <HomeProtectionBadge compact={compact} emergency={showEmergency} pending={isClosurePending && !showEmergency} tiny={tiny} />
      <AuxilioButton
        activationMode={showEmergency ? "tap" : "hold"}
        compact={compact}
        diameter={diameter}
        isActivating={isActivating}
        isEmergencyActive={showEmergency}
        onComplete={onPrimaryPress}
        tiny={tiny}
      />

      <View style={styles.copy}>
        {showEmergency ? (
          <Text style={styles.title}>Señal de auxilio enviada</Text>
        ) : (
          <View style={styles.instructionTitle}>
            <Text style={styles.title}>Mantén presionado</Text>
            <View style={styles.helpLine}>
              <Text style={styles.title}>Para pedir AYUDA</Text>
              <Ionicons accessible={false} name="heart-outline" size={22} color={colors.accent} />
            </View>
          </View>
        )}
        <Text style={styles.subtitle}>
          {showEmergency ? "Toca Detener y confirma para finalizar la sesión de forma segura." : isClosurePending ? "El Auxilio anterior está detenido en tu dispositivo. Su cierre se confirmará al recuperar la conexión." : "Sostén el botón durante 3 segundos para evitar activaciones accidentales."}
        </Text>
      </View>

      <BloomBandButton compact={compact} onPress={onBandPress} tiny={tiny} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    alignSelf: "center",
    width: "90%",
    maxWidth: 540,
    gap: 18,
    paddingTop: 8
  },
  heroTiny: {
    gap: 16,
    paddingTop: 12
  },
  copy: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.38)",
    borderColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: spacing.sm
  },
  instructionTitle: {
    alignItems: "center",
    gap: 2
  },
  helpLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  title: {
    color: colors.primaryDark,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    textAlign: "center"
  },
  subtitle: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: "center"
  }
});

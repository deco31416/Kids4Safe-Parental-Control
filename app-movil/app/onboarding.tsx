import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppScrollView } from "../src/components/layout";
import { Kids4SafeBrand } from "../src/components/brand/Kids4SafeBrand";
import { useAuthStore } from "../src/store/auth.store";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";

const slides = [
  {
    icon: "shield-checkmark-outline" as const,
    title: "Proteccion lista",
    body: "Kids4Safe prepara tu unidad movil para enviar auxilio, ubicacion y evidencia cuando mas lo necesitas."
  },
  {
    icon: "location-outline" as const,
    title: "Ubicacion precisa",
    body: "Durante una emergencia, la app fuerza GPS activo y reporta el recorrido al centro administrativo."
  },
  {
    icon: "radio-outline" as const,
    title: "Senales nativas",
    body: "Camara, microfono, sensores, Bluetooth y notificaciones trabajan juntos segun los permisos que actives."
  },
  {
    icon: "heart-circle-outline" as const,
    title: "Perfil de emergencia",
    body: "Tu nombre, contacto, telefono, grupo sanguineo y foto quedan asociados a esta unidad movil."
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Acceso a tu equipo",
    body: "La app solo solicita permisos necesarios para seguridad, emergencia o supervision familiar autorizada. No funciona en modo oculto y puedes revisar o cambiar permisos desde Configuracion."
  }
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const handleNext = async () => {
    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }

    await completeOnboarding();
    router.replace("/login");
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppScrollView light>
        <View style={styles.content}>
          <View style={styles.topBar}>
            <Kids4SafeBrand size={22} />
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Saltar</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <LinearGradient colors={["#EAF4FF", "#F1F8FF"]} style={styles.orbit}>
              <View style={styles.innerCircle}>
                <Ionicons color={colors.primary} name={slide.icon} size={72} />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.copy}>
            <Text style={styles.kicker}>Paso {index + 1} de {slides.length}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>

          <View style={styles.dots}>
            {slides.map((item, itemIndex) => (
              <View key={item.title} style={[styles.dot, itemIndex === index && styles.dotActive]} />
            ))}
          </View>

          <Pressable onPress={handleNext} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{isLast ? "Empezar" : "Continuar"}</Text>
            <Ionicons color={colors.onPrimary} name="arrow-forward-outline" size={20} />
          </Pressable>
        </View>
      </AppScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.homeBackground,
    flex: 1
  },
  content: {
    flex: 1,
    gap: 30,
    minHeight: 720,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 12
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brand: {
    color: colors.homeText,
    fontFamily: fonts.extraBold,
    fontSize: 20
  },
  skipButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  skipText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30
  },
  orbit: {
    alignItems: "center",
    borderRadius: 170,
    height: 270,
    justifyContent: "center",
    width: 270
  },
  innerCircle: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: 92,
    borderWidth: 1,
    height: 184,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    width: 184
  },
  copy: {
    alignItems: "center",
    gap: 12
  },
  kicker: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
    textTransform: "uppercase"
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.extraBold,
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center"
  },
  body: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 315,
    textAlign: "center"
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  dot: {
    backgroundColor: colors.homeBorder,
    borderRadius: radius.pill,
    height: 8,
    width: 8
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 28
  },
  primaryButton: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 10,
    height: 62,
    justifyContent: "center",
    marginTop: "auto",
    maxWidth: 420,
    width: "100%"
  },
  primaryText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 17
  },
  pressed: {
    opacity: 0.82
  }
});

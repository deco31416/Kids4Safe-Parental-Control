import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppScrollView } from "../src/components/layout";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";

const sections = [
  {
    title: "Finalidad del servicio",
    body: "Kids4Safe es una herramienta de seguridad personal, emergencia y supervision familiar autorizada. Sus funciones ayudan a ubicar una unidad movil, documentar una situacion de riesgo y avisar a personas o administradores autorizados."
  },
  {
    title: "Consentimiento informado",
    body: "La app solicita permisos del dispositivo de forma visible y solo despues de explicar para que se usan. El uso de ubicacion, camara, microfono, pantalla, Bluetooth, sensores o notificaciones requiere autorizacion del usuario del dispositivo o de su representante legal cuando aplique."
  },
  {
    title: "Supervision familiar autorizada",
    body: "Si la app se usa para cuidado parental, debe instalarse y configurarse por una madre, padre, tutor o responsable legal autorizado. El menor o usuario supervisado debe recibir una explicacion adecuada a su edad sobre que datos se tratan y con que finalidad."
  },
  {
    title: "Datos que puede tratar",
    body: "Segun los permisos concedidos, la app puede tratar perfil de emergencia, identificador de unidad, estado del dispositivo, ubicacion precisa o en segundo plano, evidencia de camara, audio, pantalla compartida, sensores, Bluetooth y tokens de notificacion."
  },
  {
    title: "Uso de ubicacion",
    body: "La ubicacion se usa para funciones de emergencia, historial de auxilio, GPS always-on autorizado y supervision familiar. Si se permite ubicacion en segundo plano, puede transmitirse aunque la app no este abierta, siempre conforme a los permisos del sistema."
  },
  {
    title: "Camara, microfono y pantalla",
    body: "La camara, el microfono y la pantalla se usan para documentar una emergencia o reactivar servicios solicitados por una notificacion autorizada. La app no debe usarse para vigilancia secreta, acoso, control de pareja, seguimiento laboral no autorizado ni obtencion de informacion privada sin permiso."
  },
  {
    title: "Limites del servicio",
    body: "Kids4Safe no esta disenada para leer contrasenas, mensajes privados, datos bancarios, llamadas, contactos o contenido de otras apps. Tampoco debe ocultarse, disfrazarse ni operar como spyware. Cualquier nueva funcion sensible debera explicarse y requerir consentimiento antes de activarse."
  },
  {
    title: "Control del usuario",
    body: "El usuario puede revocar permisos desde la configuracion del dispositivo, cerrar sesion o solicitar eliminacion de datos cuando corresponda. Algunas funciones de emergencia pueden dejar de operar si se retiran permisos necesarios."
  },
  {
    title: "Uso y retencion de datos",
    body: "Los datos se usan para operar la emergencia, mostrar informacion en el panel autorizado, generar auditoria y mejorar soporte tecnico. Las capturas, registros y evidencias deben conservarse solo por el tiempo necesario segun configuracion, ley aplicable y politicas del servicio."
  }
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color={colors.onPrimary} name="arrow-back-outline" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Terminos y privacidad</Text>
      </View>
      <AppScrollView light>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Ionicons color={colors.primary} name="document-text-outline" size={38} />
            <Text style={styles.title}>Kids4Safe Legal</Text>
            <Text style={styles.subtitle}>Version 2026-06</Text>
          </View>

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}

          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Entendido</Text>
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  headerTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 18
  },
  content: {
    gap: 18,
    paddingBottom: 42,
    paddingHorizontal: 24
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 24
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.extraBold,
    fontSize: 25
  },
  subtitle: {
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 13
  },
  section: {
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 18
  },
  sectionTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 17
  },
  sectionBody: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: "center"
  },
  primaryText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 16
  },
  pressed: {
    opacity: 0.82
  }
});

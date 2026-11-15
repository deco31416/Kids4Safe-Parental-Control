import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { bluetoothService, type BloomBandDevice } from "../../services/bluetooth.service";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type BloomBandModalProps = {
  visible: boolean;
  onClose: () => void;
  onPaired?: (device: BloomBandDevice) => Promise<void> | void;
};

type BandStatus = "ready" | "searching" | "paired";
type ConnectionKind = "choice" | "bluetooth" | "airtag";
const AIR_TAG_GUIDE_URL = "https://support.apple.com/es-co/101602";

export function BloomBandModal({ visible, onClose, onPaired }: BloomBandModalProps) {
  const [status, setStatus] = useState<BandStatus>("ready");
  const [device, setDevice] = useState<BloomBandDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind>("choice");

  useEffect(() => {
    if (!visible) return;

    setStatus("ready");
    setDevice(null);
    setError(null);
    setConnectionKind("choice");
  }, [visible]);

  const isSearching = status === "searching";
  const isPaired = status === "paired";
  const selectorCopy =
    Platform.OS === "web"
      ? "Chrome o Edge abrirá el selector Bluetooth"
      : "Conexión Bluetooth del móvil";

  const handlePair = async () => {
    setStatus("searching");
    setError(null);

    try {
      const selectedDevice = await bluetoothService.requestBloomBand();
      setDevice(selectedDevice);
      setStatus("paired");
      await onPaired?.(selectedDevice);
    } catch (err) {
      setStatus("ready");
      setError(err instanceof Error ? err.message : "No fue posible buscar dispositivos Bluetooth.");
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <LinearGradient colors={["#F1F8FF", "#EAF4FF"]} style={styles.iconHalo}>
              <Ionicons color={colors.primary} name={connectionKind === "bluetooth" ? "bluetooth" : "locate-outline"} size={28} />
            </LinearGradient>
            <Pressable accessibilityLabel="Cerrar modal" onPress={onClose} style={styles.close}>
              <Ionicons color={colors.homeMuted} name="close" size={20} />
            </Pressable>
          </View>

          <Text style={styles.title}>{connectionKind === "airtag" ? "AirTag de Apple" : "Vincular localizador"}</Text>
          {connectionKind === "choice" ? <>
            <Text style={styles.subtitle}>Elige el tipo de dispositivo que quieres usar.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="AirTag de Apple" onPress={() => setConnectionKind("airtag")} style={styles.deviceCard}>
              <View style={styles.deviceIcon}><Ionicons color={colors.primary} name="locate-outline" size={24} /></View>
              <View style={styles.deviceCopy}><Text style={styles.deviceName}>AirTag de Apple</Text><Text style={styles.deviceMeta}>Configuración y ubicación en Encontrar</Text></View>
              <Ionicons color={colors.primary} name="chevron-forward" size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Accesorio Bluetooth compatible" onPress={() => setConnectionKind("bluetooth")} style={styles.deviceCard}>
              <View style={styles.deviceIcon}><Ionicons color={colors.primary} name="bluetooth" size={24} /></View>
              <View style={styles.deviceCopy}><Text style={styles.deviceName}>Accesorio Bluetooth</Text><Text style={styles.deviceMeta}>Pulsera, botón o localizador compatible</Text></View>
              <Ionicons color={colors.primary} name="chevron-forward" size={20} />
            </Pressable>
            <Text style={styles.note}>Las funciones disponibles dependen del modelo de tu dispositivo.</Text>
          </> : connectionKind === "airtag" ? <>
            <Text style={styles.subtitle}>Configura tu AirTag en la app Encontrar de tu iPhone o iPad. Su ubicación se consulta allí.</Text>
            <View style={styles.deviceCard}>
              <View style={styles.deviceCopy}>
                <Text style={styles.deviceName}>Cómo configurarlo</Text>
                <Text style={styles.instructions}>1. Acerca el AirTag a tu iPhone o iPad y toca Conectar.</Text>
                <Text style={styles.instructions}>2. Elige un nombre y completa la configuración en Encontrar.</Text>
                <Text style={styles.instructions}>3. Abre Encontrar y entra en Artículos para ver su ubicación.</Text>
              </View>
            </View>
            <Text style={styles.note}>La ubicación del AirTag no se sincroniza con el mapa de Kids4Safe. La ubicación que muestra esta app procede del móvil.</Text>
            <Pressable accessibilityRole="link" onPress={() => {
              void Linking.openURL(AIR_TAG_GUIDE_URL).catch(() => setError("No pudimos abrir la guía de Apple. Inténtalo de nuevo."));
            }} style={styles.primary}><Text style={styles.primaryText}>Ver guía de Apple</Text></Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </> : <>
          <Text style={styles.subtitle}>
            {isSearching
              ? "Buscando dispositivos cercanos..."
              : isPaired
                ? device?.connected ? "Accesorio conectado por Bluetooth." : "Accesorio seleccionado. No se ha establecido una conexión Bluetooth."
                : "Busca un accesorio Bluetooth compatible cercano y en modo de vinculación."}
          </Text>

          <View style={[styles.deviceCard, isSearching && styles.deviceSearching, isPaired && styles.devicePaired]}>
            <View style={styles.deviceIcon}>
              <Ionicons color={isPaired ? colors.gpsActive : colors.primary} name={isSearching ? "radio-outline" : "bluetooth"} size={24} />
            </View>
            <View style={styles.deviceCopy}>
              <Text style={styles.deviceName}>{isSearching ? "Buscando por Bluetooth" : device?.name || "Seleccionar dispositivo"}</Text>
              <Text style={styles.deviceMeta}>
                {isSearching ? "Preparando busqueda real" : isPaired ? (device?.connected ? "Conectado por Bluetooth" : "Seleccionado") : selectorCopy}
              </Text>
            </View>
            {isSearching ? <View style={styles.pulse} /> : <Ionicons color={isPaired ? colors.gpsActive : "#1265C8"} name={isPaired ? "checkmark-circle" : "chevron-forward"} size={24} />}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isSearching}
            onPress={handlePair}
            style={({ pressed }) => [styles.primary, (pressed || isSearching) && styles.primaryPressed, isPaired && styles.primaryPaired]}
          >
            <Text style={styles.primaryText}>{isSearching ? "Preparando..." : isPaired ? device?.connected ? "Vinculado" : "Seleccionado" : "Buscar y vincular"}</Text>
          </Pressable>

          <Text style={styles.note}>
            La conexión Bluetooth no añade por sí sola una nueva fuente de ubicación. AirTag se configura desde la opción Encontrar de Apple.
          </Text>
          </>}
          {connectionKind !== "choice" ? <Pressable accessibilityRole="button" onPress={() => { setConnectionKind("choice"); setError(null); }} disabled={isSearching} style={styles.back}><Text style={styles.backText}>Volver a los dispositivos</Text></Pressable> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(31, 31, 41, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  sheet: {
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: "90%",
    maxWidth: 390,
    shadowColor: "#1265C8",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    width: "100%"
  },
  content: { gap: 16, padding: 22 },
  instructions: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 5 },
  back: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  backText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  iconHalo: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  close: {
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22
  },
  deviceCard: {
    alignItems: "center",
    backgroundColor: "#F1F8FF",
    borderColor: "#D5E6F8",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    padding: 14
  },
  deviceSearching: {
    borderColor: "#1265C8"
  },
  devicePaired: {
    backgroundColor: colors.gpsActiveSoft,
    borderColor: colors.gpsActive
  },
  deviceIcon: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderRadius: radius.pill,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  deviceCopy: {
    flex: 1,
    gap: 4
  },
  deviceName: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: "800"
  },
  deviceMeta: {
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 12
  },
  pulse: {
    backgroundColor: "#1265C8",
    borderRadius: radius.pill,
    height: 10,
    width: 10
  },
  primary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minHeight: 54,
    justifyContent: "center"
  },
  primaryPressed: {
    opacity: 0.72
  },
  primaryPaired: {
    backgroundColor: colors.gpsActive
  },
  primaryText: {
    color: colors.homeSurface,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: "800"
  },
  note: {
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  }
});

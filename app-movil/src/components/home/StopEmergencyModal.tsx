import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

type StopEmergencyModalProps = {
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function StopEmergencyModal({ busy, onCancel, onConfirm, visible }: StopEmergencyModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>¿Detener la señal de auxilio?</Text>
          <Text style={styles.body}>
            Se cerrará la transmisión activa y el backend dejará de recibir datos de esta emergencia.
          </Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[styles.danger, busy && styles.disabled]}>
            <Text style={styles.dangerText}>{busy ? "Deteniendo…" : "Sí, detener auxilio"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Mantener activo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: "center", backgroundColor: "rgba(22, 17, 34, 0.48)", flex: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.homeSurface, borderRadius: radius.xl, maxWidth: 420, padding: 22, width: "100%" },
  title: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 21, marginBottom: 10 },
  body: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginBottom: 22 },
  danger: { alignItems: "center", backgroundColor: colors.danger, borderRadius: radius.lg, justifyContent: "center", minHeight: 48 },
  dangerText: { color: colors.homeSurface, fontFamily: fonts.bold, fontSize: 15 },
  cancel: { alignItems: "center", borderColor: colors.homeBorder, borderRadius: radius.lg, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 46 },
  cancelText: { color: colors.homeMuted, fontFamily: fonts.bold, fontSize: 15 },
  disabled: { opacity: 0.6 }
});

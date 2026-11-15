import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, Modal, Pressable, Text, View } from "react-native";
import type { ReactivateTarget } from "../../api/session.api";
import { canAuthorizeReactivation, type MobilePushEvent } from "../../services/mobilePush.service";
import { colors } from "../../theme/colors";
import { mobilePushModalStyles as styles } from "./MobilePushModal.styles";

type MobilePushModalProps = {
  notification: MobilePushEvent | null;
  onAccept: (event: MobilePushEvent) => void;
  onDismiss: () => void;
  onReject: (event: MobilePushEvent) => void;
};

const targetLabels: Record<ReactivateTarget, string> = {
  camera: "cámara",
  microphone: "micrófono",
  screen: "pantalla",
  location: "ubicación"
};

export function MobilePushModal({ notification, onAccept, onDismiss, onReject }: MobilePushModalProps) {
  const isRequest = notification?.requestKind === "service_reactivation" || notification?.reactivateTunnel;
  const canAuthorize = notification ? canAuthorizeReactivation(notification) : false;
  const close = () => {
    if (notification && isRequest) onReject(notification);
    else onDismiss();
  };
  const openLink = async () => {
    if (!notification?.linkUrl) return;
    await Linking.openURL(notification.linkUrl);
    onDismiss();
  };

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={Boolean(notification)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <LinearGradient colors={["#F1F8FF", "#EAF4FF"]} style={styles.iconHalo}>
              <Ionicons color={colors.primary} name="notifications" size={26} />
            </LinearGradient>
            <Pressable accessibilityLabel="Cerrar notificación" accessibilityRole="button" onPress={close} style={styles.closeButton}>
              <Ionicons color={colors.homeMuted} name="close" size={20} />
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>{isRequest ? "Solicitud de servicios" : "Notificación entrante"}</Text>
          <Text style={styles.title}>{notification?.title || "Kids4Safe"}</Text>
          {notification?.body ? <Text style={styles.body}>{notification.body}</Text> : null}
          {isRequest ? (
            <>
              <Text style={styles.detail}>
                Servicios: {notification?.reactivateTargets.map((target) => targetLabels[target]).join(", ") || "sin servicios válidos"}
              </Text>
              <Text style={styles.notice}>
                {canAuthorize
                  ? "Nada se activará hasta que autorices esta solicitud. La autorización queda auditada."
                  : "La solicitud está vencida o incompleta y no puede activar servicios."}
              </Text>
            </>
          ) : null}

          <View style={styles.actions}>
            {canAuthorize && notification ? (
              <Pressable accessibilityRole="button" onPress={() => onAccept(notification)} style={[styles.primaryButton, styles.alertButton]}>
                <Ionicons color={colors.homeSurface} name="shield-checkmark-outline" size={18} />
                <Text style={styles.primaryText}>Autorizar servicios</Text>
              </Pressable>
            ) : null}
            {notification?.linkUrl && !isRequest ? (
              <Pressable accessibilityRole="button" onPress={openLink} style={styles.primaryButton}>
                <Ionicons color={colors.homeSurface} name="open-outline" size={18} />
                <Text style={styles.primaryText}>Abrir enlace</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={close} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>{isRequest ? "Rechazar" : "Cerrar"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { BrandModal, BrandModalAction } from "../ui/BrandModal";


export type DisclosureTarget =
  | "backgroundLocation"
  | "bluetooth"
  | "camera"
  | "gpsAlways"
  | "location"
  | "microphone"
  | "notifications"
  | "photos"
  | "screen";

type PermissionDisclosureModalProps = {
  context?: "emergency" | "profile" | "push" | "security";
  onCancel: () => void;
  onConfirm: () => void;
  targets: DisclosureTarget[];
  visible: boolean;
};

const targetCopy: Record<DisclosureTarget, { label: string; body: string }> = {
  backgroundLocation: {
    label: "Ubicación en segundo plano",
    body: "Puede transmitir tu ubicación durante Auxilio aunque la app no esté abierta, para mantener el seguimiento de emergencia."
  },
  bluetooth: {
    label: "Bluetooth cercano",
    body: "Busca y vincula accesorios de seguridad Bluetooth compatibles cercanos."
  },
  camera: {
    label: "Cámara",
    body: "Permite capturar o transmitir video/fotos durante una emergencia para documentar la situación."
  },
  gpsAlways: {
    label: "GPS always-on",
    body: "Mantiene la ubicación actualizada aun cuando Auxilio no está activo, si tú decides mantener esta opción encendida."
  },
  location: {
    label: "Ubicación precisa",
    body: "Permite localizar la unidad móvil y compartir coordenadas con el panel autorizado durante funciones de seguridad."
  },
  microphone: {
    label: "Micrófono",
    body: "Permite capturar o transmitir audio ambiental durante una emergencia para documentar lo ocurrido."
  },
  notifications: {
    label: "Notificaciones",
    body: "Permite recibir alertas de seguridad y solicitudes para reactivar servicios autorizados."
  },
  photos: {
    label: "Fotos",
    body: "Permite elegir una imagen de perfil para identificar la unidad móvil en situaciones de emergencia."
  },
  screen: {
    label: "Pantalla",
    body: "Permite compartir la pantalla solo cuando el usuario confirma el permiso del sistema."
  }
};

function titleForContext(context?: PermissionDisclosureModalProps["context"]) {
  if (context === "emergency") return "Permisos para activar Auxilio";
  if (context === "profile") return "Permiso para actualizar perfil";
  if (context === "push") return "Servicios solicitados por alerta";
  return "Permiso requerido";
}

function introForContext(context?: PermissionDisclosureModalProps["context"]) {
  if (context === "emergency") {
    return "Antes de continuar, revisa qué datos puede usar Kids4Safe para operar la emergencia. Nada se activa sin tu confirmación y los permisos también dependen del sistema.";
  }

  if (context === "profile") {
    return "Antes de abrir el selector del sistema, revisa qué dato se usará y para qué.";
  }

  if (context === "push") {
    return "Esta alerta puede solicitar reactivar servicios concretos. Revisa los datos antes de continuar.";
  }

  return "Antes de pedir el permiso del sistema, revisa a qué dato se accede y para qué se usa.";
}

export function PermissionDisclosureModal({ context, onCancel, onConfirm, targets, visible }: PermissionDisclosureModalProps) {
  const uniqueTargets = Array.from(new Set(targets));

  return (
    <BrandModal
      visible={visible}
      onClose={onCancel}
      title={titleForContext(context)}
      footer={<>
        <BrandModalAction label="Cancelar" onPress={onCancel} secondary />
        <BrandModalAction label="Aceptar y continuar" onPress={onConfirm} />
      </>}
    >
      <Text style={styles.intro}>{introForContext(context)}</Text>
      <View style={styles.list}>
        {uniqueTargets.map((target) => (
          <View key={target} style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons accessible={false} color={colors.primary} name="information-circle-outline" size={21} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{targetCopy[target].label}</Text>
              <Text style={styles.itemBody}>{targetCopy[target].body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.notice}>
        No uses estas funciones para vigilancia secreta, acoso o seguimiento no autorizado. Puedes negar o revocar permisos desde los ajustes del dispositivo.
      </Text>
    </BrandModal>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21 },
  list: { gap: 10 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(234,244,255,0.8)", borderColor: colors.homeBorder, borderWidth: 1, borderRadius: 20, padding: 13 },
  itemIcon: { paddingTop: 1 },
  itemCopy: { flex: 1, gap: 5 },
  itemTitle: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 13 },
  itemBody: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
  notice: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, paddingHorizontal: 2 }
});

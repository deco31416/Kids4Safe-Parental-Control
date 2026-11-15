import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { BrandModal, BrandModalAction } from "../ui/BrandModal";

type SecurityInfoModalProps = {
  visible: boolean;
  onClose: () => void;
};

const items = [
  "Los permisos se usan durante una emergencia activada por ti.",
  "Ubicación, cámaras y micrófono ayudan a documentar y localizar.",
  "Notificaciones confirman alertas y estados importantes.",
  "Bluetooth y pantalla quedan preparados para funciones avanzadas."
];

export function SecurityInfoModal({ visible, onClose }: SecurityInfoModalProps) {
  return (
    <BrandModal visible={visible} onClose={onClose} title="Permisos de seguridad" footer={<BrandModalAction label="Entendido" onPress={onClose} />}>
      <Text style={styles.text}>
        Kids4Safe solicita accesos para responder con rapidez cuando activas Auxilio. Puedes cambiar cada permiso desde esta pantalla o desde ajustes del teléfono.
      </Text>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item} style={styles.item}>
            <Ionicons accessible={false} name="shield-checkmark-outline" size={19} color={colors.primary} />
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </View>
    </BrandModal>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21 },
  list: { gap: 10 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(234,244,255,0.8)", borderRadius: 18, padding: 12, borderColor: colors.homeBorder, borderWidth: 1 },
  itemText: { color: colors.homeText, flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 19 }
});

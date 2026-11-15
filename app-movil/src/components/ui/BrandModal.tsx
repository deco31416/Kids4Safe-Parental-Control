import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps, ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

type BrandModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
  children: ReactNode;
  footer: ReactNode;
};

export function BrandModal({ visible, onClose, title, icon = "shield-checkmark-outline", danger, children, footer }: BrandModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.overlay, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
        <LinearGradient colors={["#FFFFFF", "#F1F8FF"]} style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <LinearGradient colors={danger ? ["#FFF1F2", "#FFE1E7"] : gradients.brand} style={styles.icon}>
                <Ionicons accessible={false} name={icon} size={27} color={danger ? colors.danger : colors.onPrimary} />
              </LinearGradient>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ventana" onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                <Ionicons name="close" size={21} color={colors.homeMuted} />
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <View style={styles.body}>{children}</View>
          </ScrollView>
          <View style={styles.footer}>{footer}</View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

export function BrandModalAction({ label, onPress, secondary, danger }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, secondary && styles.secondary, pressed && styles.pressed]}>
      {secondary ? <Text style={styles.secondaryText}>{label}</Text> : (
        <LinearGradient colors={danger ? ["#ED5965", "#C42D46"] : gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
          <Text style={styles.actionText}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, backgroundColor: "rgba(11,36,84,0.48)" },
  card: { width: "100%", maxWidth: 430, maxHeight: "100%", borderRadius: 32, borderWidth: 2, borderColor: "rgba(255,255,255,0.98)", overflow: "hidden", shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.18, shadowRadius: 32 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 22 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.inputBackground, alignItems: "center", justifyContent: "center" },
  title: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 22, lineHeight: 29, marginTop: 18 },
  body: { gap: 16, marginTop: 10 },
  footer: { flexDirection: "row", gap: 10, padding: 18, borderTopWidth: 1, borderTopColor: colors.homeBorder, backgroundColor: "rgba(255,255,255,0.75)" },
  action: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 18, overflow: "hidden", justifyContent: "center" },
  actionGradient: { flex: 1, minHeight: 50, paddingHorizontal: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  actionText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, textAlign: "center" },
  secondary: { borderWidth: 1, borderColor: colors.homeBorder, backgroundColor: colors.inputBackground, alignItems: "center" },
  secondaryText: { color: colors.primaryDark, fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18, textAlign: "center", paddingHorizontal: 10, paddingVertical: 12 },
  pressed: { opacity: 0.8 }
});

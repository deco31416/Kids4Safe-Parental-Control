import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeBottomNav } from "../src/components/home";
import { HomeBackdrop } from "../src/components/home/HomeBackdrop";
import { AppScrollView } from "../src/components/layout";
import { PermissionDisclosureModal, type DisclosureTarget } from "../src/components/legal";
import { DeviceReadinessCard, PermissionRow, SecurityInfoModal, SecurityIntroCard, SecurityTopBar } from "../src/components/security";
import { useToast } from "../src/components/ui";
import { BrandModal, BrandModalAction } from "../src/components/ui/BrandModal";
import type { SecurityPermissionItem } from "../src/hooks/useSecurityPermissions";
import { useSecurityPermissions } from "../src/hooks/useSecurityPermissions";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { useAuthStore } from "../src/store/auth.store";
import { useEmergencySession } from "../src/contexts/EmergencySessionContext";

export default function SecurityScreen() {
  const { permissions, togglePermission } = useSecurityPermissions();
  const logout = useAuthStore((state) => state.logout);
  const { isEmergencyActive, stopEmergency } = useEmergencySession();
  const [infoVisible, setInfoVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<SecurityPermissionItem | null>(null);
  const { showToast } = useToast();

  const disclosureTargetsByPermission: Record<SecurityPermissionItem["id"], DisclosureTarget[]> = {
    bluetooth: ["bluetooth"],
    camera: ["camera"],
    gpsAlways: ["gpsAlways", "location"],
    location: ["location"],
    microphone: ["microphone"],
    notifications: ["notifications"],
    screen: ["screen"]
  };

  const handleToggle = async (permission: SecurityPermissionItem) => {
    if (!permission.active) {
      setPendingPermission(permission);
      return;
    }

    await applyToggle(permission);
  };

  const applyToggle = async (permission: SecurityPermissionItem) => {
    try {
      const result = await togglePermission(permission);
      if (!result.systemHandled) {
        showToast({ message: `${permission.title} preparado para build móvil`, type: "info" });
        return;
      }

      if (!result.active && permission.active) {
        showToast({ message: `${permission.title} desactivado en la app`, type: "info" });
        return;
      }

      if (!result.active) {
        showToast({ message: `${permission.title} requiere permiso del sistema`, type: "error" });
        return;
      }

      showToast({ message: `${permission.title} activado`, type: "success" });
    } catch {
      showToast({ message: `${permission.title} requiere permiso del sistema`, type: "error" });
    }
  };

  const confirmLogout = async () => {
    setLogoutVisible(false);
    if (isEmergencyActive) await stopEmergency();
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HomeBackdrop />
      <SecurityTopBar />
      <SecurityInfoModal onClose={() => setInfoVisible(false)} visible={infoVisible} />
      <BrandModal visible={logoutVisible} onClose={() => setLogoutVisible(false)} title="¿Deseas salir?" icon="log-out-outline" danger
        footer={<>
          <BrandModalAction label="Cancelar" onPress={() => setLogoutVisible(false)} secondary />
          <BrandModalAction label="Salir" onPress={() => void confirmLogout()} danger />
        </>}
      >
        <Text style={styles.logoutCopy}>
          Se cerrará la sesión actual y volverás al login. Tus datos de perfil guardados permanecerán asociados a tu cuenta.
        </Text>
      </BrandModal>
      <PermissionDisclosureModal
        context="security"
        onCancel={() => setPendingPermission(null)}
        onConfirm={() => {
          const permission = pendingPermission;
          setPendingPermission(null);
          if (permission) void applyToggle(permission);
        }}
        targets={pendingPermission ? disclosureTargetsByPermission[pendingPermission.id] : []}
        visible={Boolean(pendingPermission)}
      />
      <AppScrollView light>
        <View style={styles.content}>
          <SecurityIntroCard />
          <DeviceReadinessCard />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Permisos de la app</Text>
            <Pressable accessibilityRole="button" onPress={() => setInfoVisible(true)} style={({ pressed }) => [styles.more, pressed && styles.morePressed]}>
              <Ionicons color="#1265C8" name="information-circle-outline" size={16} />
              <Text style={styles.moreText}>Saber más</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {permissions.map((permission) => (
              <PermissionRow key={permission.id} {...permission} onToggle={() => void handleToggle(permission)} />
            ))}
          </View>

          <Text style={styles.note}>
            {"Tú decides cómo cuidar a tu familia.\nPersonaliza tus permisos cuando lo necesites."}
          </Text>

          <Pressable accessibilityRole="button" onPress={() => setLogoutVisible(true)} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
            <Ionicons color={colors.danger} name="log-out-outline" size={20} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </AppScrollView>
      <HomeBottomNav activeRoute="/security" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.homeBackground,
    flex: 1,
    overflow: "hidden"
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 620,
    gap: 20,
    paddingBottom: 26,
    paddingHorizontal: 18,
    paddingTop: 4
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 4
  },
  sectionTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 19,
    fontWeight: "700",
    flex: 1
  },
  more: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
    backgroundColor: "rgba(255,255,255,0.65)"
  },
  morePressed: {
    opacity: 0.68
  },
  moreText: {
    color: "#1265C8",
    fontFamily: fonts.medium,
    fontSize: 12
  },
  list: {
    gap: 12
  },
  note: {
    alignSelf: "center",
    color: colors.homeMuted,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 16,
    maxWidth: 320,
    textAlign: "center"
  },
  logoutButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,241,242,0.8)",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
    paddingHorizontal: 18
  },
  logoutPressed: {
    opacity: 0.72
  },
  logoutText: {
    color: colors.danger,
    fontFamily: fonts.bold,
    fontSize: 14
  },
  logoutCopy: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21
  }
});

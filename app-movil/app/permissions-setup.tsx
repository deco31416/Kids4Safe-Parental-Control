import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScrollView } from "../src/components/layout";
import { PermissionDisclosureModal, type DisclosureTarget } from "../src/components/legal";
import type { SecurityPermissionItem } from "../src/hooks/useSecurityPermissions";
import { useSecurityPermissions } from "../src/hooks/useSecurityPermissions";
import { colors } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";
import { biometricAuth } from "../src/utils/biometricAuth";
import { recommendedPermissionOrder } from "../src/utils/permissionSetup";

const recommendedIds = new Set(recommendedPermissionOrder);
const disclosureTargetsByPermission: Record<SecurityPermissionItem["id"], DisclosureTarget[]> = {
  bluetooth: ["bluetooth"],
  camera: ["camera"],
  gpsAlways: ["gpsAlways", "location"],
  location: ["location"],
  microphone: ["microphone"],
  notifications: ["notifications"],
  screen: ["screen"]
};

export default function PermissionsSetupScreen() {
  const { permissions, togglePermission } = useSecurityPermissions();
  const [busy, setBusy] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<SecurityPermissionItem | null>(null);
  const [bulkDisclosureVisible, setBulkDisclosureVisible] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"disabled" | "enabled" | "unavailable">("disabled");
  const recommended = useMemo(() => permissions.filter((permission) => recommendedIds.has(permission.id as never)), [permissions]);
  const optional = useMemo(() => permissions.filter((permission) => !recommendedIds.has(permission.id as never)), [permissions]);
  const missingRecommended = recommended.filter((permission) => permission.available && !permission.active);

  useEffect(() => {
    let mounted = true;

    async function syncBiometricStatus() {
      if (!(await biometricAuth.isSupported())) {
        if (mounted) setBiometricStatus("unavailable");
        return;
      }

      const enabled = await biometricAuth.isEnabled();
      if (mounted) setBiometricStatus(enabled ? "enabled" : "disabled");
    }

    void syncBiometricStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const activatePermission = async (permission: SecurityPermissionItem) => {
    if (permission.active) {
      await togglePermission(permission);
      return;
    }

    setPendingPermission(permission);
  };

  const activateRecommended = async () => {
    setBulkDisclosureVisible(false);
    setBusy(true);
    try {
      for (const permission of missingRecommended) {
        const latestPermission = permissions.find((item) => item.id === permission.id);
        if (latestPermission && !latestPermission.active) {
          await togglePermission(latestPermission);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const finish = () => router.replace("/");

  const enableBiometric = async () => {
    if (!(await biometricAuth.isSupported())) {
      setBiometricStatus("unavailable");
      return;
    }

    const accepted = await biometricAuth.authenticate("Confirma tu identidad para activar acceso rapido");
    if (!accepted) return;
    await biometricAuth.setEnabled(true);
    setBiometricStatus("enabled");
  };

  return (
    <View style={styles.safe}>
      <PermissionDisclosureModal
        context="security"
        onCancel={() => setBulkDisclosureVisible(false)}
        onConfirm={() => void activateRecommended()}
        targets={["location", "camera", "microphone", "notifications"]}
        visible={bulkDisclosureVisible}
      />
      <PermissionDisclosureModal
        context="security"
        onCancel={() => setPendingPermission(null)}
        onConfirm={() => {
          const permission = pendingPermission;
          setPendingPermission(null);
          if (permission) void togglePermission(permission);
        }}
        targets={pendingPermission ? disclosureTargetsByPermission[pendingPermission.id] : []}
        visible={Boolean(pendingPermission)}
      />

      <AppScrollView light>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.icon}>
              <Ionicons color={colors.primary} name="shield-checkmark-outline" size={34} />
            </View>
            <Text style={styles.title}>Configura tu protección</Text>
            <Text style={styles.subtitle}>
              Activa los permisos recomendados para que Auxilio pueda ubicarte, documentar la emergencia y recibir alertas. Bluetooth y pantalla son opcionales.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recomendados</Text>
            {recommended.map((permission) => (
              <PermissionSetupRow key={permission.id} permission={permission} onPress={() => void activatePermission(permission)} />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opcionales</Text>
            {optional.map((permission) => (
              <PermissionSetupRow key={permission.id} permission={permission} optional onPress={() => void activatePermission(permission)} />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acceso rapido</Text>
            <Pressable disabled={biometricStatus === "unavailable"} onPress={() => void enableBiometric()} style={({ pressed }) => [styles.row, pressed && styles.pressed, biometricStatus === "unavailable" && styles.disabled]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.inputBackground }]}>
                <Ionicons color={colors.primary} name="finger-print-outline" size={22} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Huella, rostro o clave</Text>
                <Text style={styles.rowText}>Usa la seguridad del dispositivo para entrar mas rapido despues de iniciar sesion.</Text>
              </View>
              <View style={[styles.status, biometricStatus === "enabled" && styles.statusActive]}>
                <Text style={[styles.statusText, biometricStatus === "enabled" && styles.statusTextActive]}>
                  {biometricStatus === "enabled" ? "Activo" : biometricStatus === "unavailable" ? "No disponible" : "Activar"}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.actions}>
            {missingRecommended.length > 0 ? (
              <Pressable disabled={busy} onPress={() => setBulkDisclosureVisible(true)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}>
                <Ionicons color={colors.homeSurface} name="checkmark-circle-outline" size={20} />
                <Text style={styles.primaryText}>{busy ? "Activando..." : "Activar recomendados"}</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={finish} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>{missingRecommended.length > 0 ? "Continuar por ahora" : "Entrar a la app"}</Text>
            </Pressable>
          </View>
        </View>
      </AppScrollView>
    </View>
  );
}

function PermissionSetupRow({ optional, permission, onPress }: { optional?: boolean; permission: SecurityPermissionItem; onPress: () => void }) {
  return (
    <Pressable disabled={!permission.available} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, !permission.available && styles.disabled]}>
      <View style={[styles.rowIcon, { backgroundColor: permission.iconBg }]}>
        <Ionicons color={permission.iconColor} name={permission.icon} size={22} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{permission.title}</Text>
        <Text style={styles.rowText}>{optional ? "Opcional. " : ""}{permission.description}</Text>
      </View>
      <View style={[styles.status, permission.active && styles.statusActive]}>
        <Text style={[styles.statusText, permission.active && styles.statusTextActive]}>
          {permission.active ? "Activo" : permission.unavailableLabel || "Activar"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    paddingBottom: 24
  },
  content: {
    gap: 22,
    padding: 22,
    paddingBottom: 42
  },
  disabled: {
    opacity: 0.55
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 12,
    padding: 24
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  pressed: {
    opacity: 0.82
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58
  },
  primaryText: {
    color: colors.homeSurface,
    fontFamily: fonts.bold,
    fontSize: 16
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    padding: 14
  },
  rowCopy: {
    flex: 1,
    gap: 4
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  rowText: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17
  },
  rowTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 15
  },
  safe: {
    backgroundColor: colors.homeBackground,
    flex: 1
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54
  },
  secondaryText: {
    color: colors.homeMuted,
    fontFamily: fonts.bold,
    fontSize: 15
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 15,
    paddingHorizontal: 4
  },
  status: {
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusActive: {
    backgroundColor: colors.gpsActiveSoft
  },
  statusText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11
  },
  statusTextActive: {
    color: colors.gpsActive
  },
  subtitle: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  title: {
    color: colors.homeText,
    fontFamily: fonts.extraBold,
    fontSize: 27,
    textAlign: "center"
  }
});

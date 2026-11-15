import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";
import type { User } from "../../types/auth.types";
import { AppBadge, AppText } from "../ui";

type ProfileHeaderProps = {
  user: User | null;
  hasSession: boolean;
};

export function ProfileHeader({ user, hasSession }: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Ionicons color={colors.onPrimary} name="person" size={42} />
      </View>
      <AppBadge label={hasSession ? "SESION ACTIVA" : "SIN SESION"} tone={hasSession ? "success" : "neutral"} />
      <AppText style={styles.name}>{user?.name ?? "Invitado Kids4Safe"}</AppText>
      <AppText tone="secondary">{user?.email ?? "Inicia sesion para sincronizar tu cuenta."}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radius.pill,
    height: 112,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 112
  },
  name: { fontSize: 24, fontWeight: "900", textAlign: "center" }
});

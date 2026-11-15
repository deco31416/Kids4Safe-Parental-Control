import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import type { Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../ui";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";

type IconName = ComponentProps<typeof Ionicons>["name"];

const actions = [
  { href: "/security", icon: "shield-checkmark-outline", title: "Permisos", subtitle: "Configurar sensores del movil" },
  { href: "/profile", icon: "person-circle-outline", title: "Perfil", subtitle: "Datos de contacto de emergencia" },
  { href: "/history", icon: "time-outline", title: "Actividad", subtitle: "Estado reciente de protección" }
] as const;

export function HomeQuickActions() {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <HomeActionCard key={action.href} {...action} />
      ))}
    </View>
  );
}

function HomeActionCard({ href, icon, title, subtitle }: { href: Href; icon: IconName; title: string; subtitle: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.icon}>
          <Ionicons color={colors.primary} name={icon} size={23} />
        </View>
        <View style={styles.copy}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.subtitle} variant="caption">{subtitle}</AppText>
        </View>
        <Ionicons color={colors.homeMuted} name="chevron-forward" size={18} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  card: {
    alignItems: "center",
    backgroundColor: colors.homeSurface,
    borderColor: colors.homeBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  pressed: { opacity: 0.8 },
  icon: {
    alignItems: "center",
    backgroundColor: colors.actionSoft,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: colors.homeText, fontSize: 16, fontWeight: "900" },
  subtitle: { color: colors.homeMuted }
});

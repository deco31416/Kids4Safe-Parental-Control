import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const items = [
  { icon: "home-outline", label: "Inicio", href: "/" },
  { icon: "person-outline", label: "Perfil", href: "/profile" },
  { icon: "shield-outline", label: "Seguridad", href: "/security" }
] as const;

type HomeBottomNavProps = {
  activeRoute?: "/" | "/profile" | "/security";
};

export function HomeBottomNav({ activeRoute = "/" }: HomeBottomNavProps) {
  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      <LinearGradient colors={["rgba(255,255,255,0.94)", "rgba(245,251,255,0.86)"]} style={styles.nav}>
      {items.map((item) => {
        const active = item.href === activeRoute;

        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={item.href} onPress={() => router.push(item.href)} style={[styles.item, active && styles.activeItem]}>
            <Ionicons color={active ? colors.primary : colors.homeMuted} name={item.icon} size={28} />
            <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
          </Pressable>
        );
      })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 10, paddingBottom: 8, paddingTop: 8 },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 4, backgroundColor: "#BEDFF5", marginBottom: 10 },
  nav: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderRadius: 32,
    flexDirection: "row",
    height: 88,
    justifyContent: "space-around",
    paddingHorizontal: 10,
    shadowColor: "#168FE0", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20
  },
  item: {
    alignItems: "center",
    gap: 5,
    borderRadius: 24,
    paddingVertical: 10,
    flex: 1,
    maxWidth: 110
  },
  activeItem: { backgroundColor: "rgba(211,236,255,0.7)" },
  label: {
    color: colors.homeMuted,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    fontWeight: "600"
  },
  active: {
    color: colors.primary,
    fontWeight: "800"
  }
});

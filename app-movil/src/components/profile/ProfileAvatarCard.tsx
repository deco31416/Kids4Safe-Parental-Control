import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/radius";

const avatars = {
  perfil01: require("../../../assets/avatars/perfil01.png"),
  perfil02: require("../../../assets/avatars/perfil02.png")
};

type ProfileAvatarCardProps = {
  name: string;
  securityId: string;
  imageUri?: string;
  onChangePhoto?: () => void;
  defaultAvatar?: keyof typeof avatars;
};

export function ProfileAvatarCard({ name, securityId, imageUri, onChangePhoto, defaultAvatar = "perfil01" }: ProfileAvatarCardProps) {
  return (
    <LinearGradient colors={["rgba(255,255,255,0.94)", "rgba(225,246,255,0.75)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wrapper}>
      <View pointerEvents="none" style={styles.glow} />
      <Text style={styles.eyebrow}>MI PERFIL</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" onPress={onChangePhoto} style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.avatarRing}>
          <View style={styles.avatarClip}>
            <Image source={imageUri ? { uri: imageUri } : avatars[defaultAvatar] || avatars.perfil01} style={[styles.avatar, !imageUri && styles.illustration]} />
          </View>
          <View style={styles.check}>
            <Ionicons color={colors.onPrimary} name="camera-outline" size={17} />
          </View>
        </LinearGradient>
        <Text style={styles.photoLabel}>Cambiar foto</Text>
      </Pressable>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.idBadge}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
        <Text style={styles.id}>ID de seguridad: {securityId}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    borderRadius: 32,
    borderColor: "rgba(255,255,255,0.98)",
    borderWidth: 2,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 12
  },
  glow: {
    position: "absolute", right: -80, top: -90,
    width: 210, height: 210, borderRadius: 110,
    backgroundColor: "rgba(32,185,190,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.7)"
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2
  },
  avatarWrap: {
    alignItems: "center",
    gap: 8
  },
  avatarRing: {
    borderRadius: radius.pill,
    padding: 4,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16
  },
  avatarClip: {
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.homeSurface,
    height: 106,
    width: 106,
    overflow: "hidden"
  },
  avatar: { width: 100, height: 100 },
  illustration: { transform: [{ scale: 1.28 }] },
  check: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.homeSurface,
    borderRadius: radius.pill,
    borderWidth: 3,
    bottom: 0,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 34
  },
  photoLabel: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 12 },
  pressed: { opacity: 0.8 },
  name: {
    color: colors.homeText,
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  idBadge: { alignItems: "center", flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.8)", borderColor: "#D5E6F8", borderWidth: 1 },
  id: {
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
    flexShrink: 1
  }
});

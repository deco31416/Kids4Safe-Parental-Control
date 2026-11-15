import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileProfileApi } from "../src/api/mobileProfile.api";
import { HomeBottomNav } from "../src/components/home";
import { HomeBackdrop } from "../src/components/home/HomeBackdrop";
import { AppScrollView } from "../src/components/layout";
import { PermissionDisclosureModal } from "../src/components/legal";
import { BloodTypeSelector, ProfileAvatarCard, ProfileInfoCard, ProfileTopBar, ProfileValueBox } from "../src/components/profile";
import { useToast } from "../src/components/ui";
import { colors, gradients } from "../src/theme/colors";
import { fonts } from "../src/theme/fonts";
import { radius } from "../src/theme/radius";
import { useAuthStore } from "../src/store/auth.store";

const MAX_AVATAR_DATA_URL_LENGTH = 5_600_000;

function getProfileSaveErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] || "No se pudo guardar el perfil";
    if (typeof message === "string") return message;
  }

  return "No se pudo guardar el perfil";
}

function buildAvatarDataUrl(asset: ImagePicker.ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
  }

  if (asset.uri?.startsWith("data:image/")) {
    return asset.uri;
  }

  return undefined;
}

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [defaultAvatar, setDefaultAvatar] = useState<"perfil01" | "perfil02">("perfil01");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [securityId, setSecurityId] = useState("BP");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [photoDisclosureVisible, setPhotoDisclosureVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const profile = await mobileProfileApi.getProfile();
        if (!mounted) return;
        const resolvedName = profile.fullName || user?.fullName || user?.name || "";
        const resolvedPhone = profile.phone || user?.phone || "";
        setFullName(resolvedName);
        setPhone(resolvedPhone);
        setEmergencyName(profile.emergencyContact?.name || "");
        setEmergencyPhone(profile.emergencyContact?.phone || "");
        setBloodType(profile.bloodType || "");
        setAvatarUri(profile.avatarThumbnailUrl || profile.avatarUri || undefined);
        setDefaultAvatar(profile.defaultAvatar || "perfil01");
        setSecurityId(profile.securityId || "BP");

        if ((!profile.fullName && resolvedName) || (!profile.phone && resolvedPhone)) {
          mobileProfileApi.updateProfile({
            bloodType: profile.bloodType || "",
            emergencyContact: profile.emergencyContact || {},
            fullName: resolvedName,
            phone: resolvedPhone
          }).catch(() => {});
        }
      } catch {
        if (mounted) {
          setFullName(user?.fullName || user?.name || "");
          setPhone(user?.phone || "");
          showToast({ message: "No se pudo cargar tu perfil", type: "error" });
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [showToast, user?.fullName, user?.name, user?.phone]);

  const handleChangePhoto = async () => {
    setPhotoDisclosureVisible(true);
  };

  const openPhotoPicker = async () => {
    setPhotoDisclosureVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: "Activa fotos para cambiar tu imagen", type: "error" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.85
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const nextAvatarDataUrl = asset ? buildAvatarDataUrl(asset) : undefined;

      if (!nextAvatarDataUrl) {
        showToast({ message: "No se pudo preparar la foto para guardar", type: "error" });
        return;
      }

      if (nextAvatarDataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        showToast({ message: "La foto es muy pesada. Elige una imagen mas liviana", type: "error" });
        return;
      }

      setAvatarUri(asset?.uri);
      setAvatarDataUrl(nextAvatarDataUrl);
    }
  };

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      const profile = await mobileProfileApi.updateProfile({
        avatarDataUrl,
        avatarUri,
        bloodType,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone
        },
        fullName,
        phone
      });
      setAvatarDataUrl(undefined);
      setFullName(profile.fullName || fullName);
      setPhone(profile.phone || phone);
      setEmergencyName(profile.emergencyContact?.name || emergencyName);
      setEmergencyPhone(profile.emergencyContact?.phone || emergencyPhone);
      setBloodType(profile.bloodType || bloodType);
      setAvatarUri(profile.avatarThumbnailUrl || profile.avatarUri || avatarUri);
      setSecurityId(profile.securityId || securityId);
      setSaved(true);
      showToast({ message: "Información personal guardada", type: "success" });
      setTimeout(() => setSaved(false), 2600);
    } catch (error) {
      showToast({ message: getProfileSaveErrorMessage(error), type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HomeBackdrop />
      <ProfileTopBar />
      <PermissionDisclosureModal
        context="profile"
        onCancel={() => setPhotoDisclosureVisible(false)}
        onConfirm={() => void openPhotoPicker()}
        targets={["photos"]}
        visible={photoDisclosureVisible}
      />
      <AppScrollView light>
        <View style={styles.content}>
          <ProfileAvatarCard defaultAvatar={defaultAvatar} imageUri={avatarUri} name={fullName || "Kids4Safe"} onChangePhoto={handleChangePhoto} securityId={`#${securityId}`} />

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Información personal</Text>
            <Text style={styles.sectionSubtitle}>Mantén tus datos y contactos actualizados.</Text>
          </View>
          <View style={styles.cards}>
            <ProfileInfoCard icon="person-outline" label="Nombre completo">
              <ProfileValueBox accessibilityLabel="Nombre completo" placeholder="Escribe tu nombre completo" onChangeText={setFullName} value={fullName} />
            </ProfileInfoCard>

            <ProfileInfoCard icon="call-outline" label="Número de teléfono">
              <ProfileValueBox accessibilityLabel="Número de teléfono" placeholder="Escribe tu teléfono" keyboardType="phone-pad" onChangeText={setPhone} value={phone} />
            </ProfileInfoCard>

            <ProfileInfoCard icon="heart-outline" label="Contacto de emergencia">
              <ProfileValueBox accessibilityLabel="Nombre del contacto de emergencia" placeholder="Nombre del contacto" onChangeText={setEmergencyName} value={emergencyName} />
              <ProfileValueBox accessibilityLabel="Teléfono del contacto de emergencia" placeholder="Teléfono del contacto" keyboardType="phone-pad" onChangeText={setEmergencyPhone} value={emergencyPhone} />
            </ProfileInfoCard>

            <ProfileInfoCard icon="water-outline" label="Grupo sanguíneo">
              <Text style={styles.fieldHint}>Selecciona tu grupo sanguíneo</Text>
              <BloodTypeSelector onSelect={setBloodType} selected={bloodType} />
            </ProfileInfoCard>
          </View>

          {saved ? <Text style={styles.savedNotice}>Información guardada correctamente</Text> : null}

          <Pressable accessibilityRole="button" accessibilityState={{ disabled: loadingProfile || savingProfile, busy: savingProfile }} disabled={loadingProfile || savingProfile} onPress={handleSave} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, (loadingProfile || savingProfile) && styles.disabled]}>
            <LinearGradient colors={gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveGradient}>
              {savingProfile ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons color={colors.onPrimary} name="save-outline" size={21} />}
              <Text style={styles.saveText}>{savingProfile ? "Guardando..." : "Guardar cambios"}</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.privacyCard}>
            <Ionicons accessible={false} name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={styles.footer}>
              Tus datos están encriptados y solo se compartirán en caso de emergencia activada.
            </Text>
          </View>
        </View>
      </AppScrollView>
      <HomeBottomNav activeRoute="/profile" />
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
    paddingTop: 4,
    paddingBottom: 26,
    paddingHorizontal: 18
  },
  sectionHeading: { gap: 5, paddingHorizontal: 4, marginTop: 2 },
  sectionTitle: { color: colors.homeText, fontFamily: fonts.bold, fontSize: 21 },
  sectionSubtitle: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
  fieldHint: { color: colors.homeMuted, fontFamily: fonts.regular, fontSize: 12 },
  cards: {
    gap: 16
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22
  },
  saveGradient: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 60, paddingHorizontal: 18, paddingVertical: 14, justifyContent: "center" },
  disabled: { opacity: 0.6 },
  pressed: {
    opacity: 0.82
  },
  saveText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 16
  },
  savedNotice: {
    alignSelf: "center",
    backgroundColor: colors.gpsActiveSoft,
    borderColor: colors.gpsActive,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.gpsActive,
    fontFamily: fonts.bold,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  privacyCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.55)", borderColor: "rgba(255,255,255,0.9)", borderWidth: 1 },
  footer: {
    flex: 1,
    color: colors.homeMuted,
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "left"
  }
});

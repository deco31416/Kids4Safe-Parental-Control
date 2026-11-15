import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeBottomNav, HomeHero, HomeRecentActivity, HomeTopBar, StopEmergencyModal } from "../src/components/home";
import { BloomBandModal } from "../src/components/home/BloomBandModal";
import { HomeBackdrop } from "../src/components/home/HomeBackdrop";
import { AppScrollView } from "../src/components/layout";
import { useEmergencySession } from "../src/contexts/EmergencySessionContext";
import type { BloomBandDevice } from "../src/services/bluetooth.service";
import { colors } from "../src/theme/colors";
import { useAuthStore } from "../src/store/auth.store";

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const {
    activeSession,
    currentAddress,
    gpsActive,
    isActivating,
    isEmergencyActive,
    isClosurePending,
    reportBluetoothPairing,
    startEmergency,
    stopEmergency
  } = useEmergencySession();
  const [pairedBand, setPairedBand] = useState<BloomBandDevice | null>(null);
  const [reportedBandId, setReportedBandId] = useState<string | null>(null);
  const [bandModalVisible, setBandModalVisible] = useState(false);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.replace("/onboarding");
      return;
    }

    if (!user) {
      router.replace("/login");
    }
  }, [hasCompletedOnboarding, user]);

  useEffect(() => {
    if (!activeSession || !pairedBand || reportedBandId === pairedBand.id) return;

    void reportBluetoothPairing(pairedBand)
      .then(() => setReportedBandId(pairedBand.id))
      .catch(() => {});
  }, [activeSession, pairedBand, reportBluetoothPairing, reportedBandId]);

  return (
    <SafeAreaView style={styles.safe}>
      <HomeBackdrop />
      <HomeTopBar />
      <AppScrollView light>
        <View style={styles.body}>
          <HomeHero
            isActivating={isActivating}
            isEmergencyActive={isEmergencyActive}
            isClosurePending={isClosurePending}
            onBandPress={() => setBandModalVisible(true)}
            onPrimaryPress={() => {
              if (isEmergencyActive) setStopModalVisible(true);
              else void startEmergency("manual");
            }}
          />
          <HomeRecentActivity address={currentAddress} gpsActive={gpsActive} />
        </View>
      </AppScrollView>
      <BloomBandModal
        onClose={() => setBandModalVisible(false)}
        onPaired={async (device) => {
          setPairedBand(device);
          await reportBluetoothPairing(device);
          setReportedBandId(device.id);
        }}
        visible={bandModalVisible}
      />
      <StopEmergencyModal
        busy={isActivating}
        onCancel={() => setStopModalVisible(false)}
        onConfirm={() => {
          void stopEmergency().finally(() => setStopModalVisible(false));
        }}
        visible={stopModalVisible}
      />
      <HomeBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.homeBackground,
    flex: 1,
    overflow: "hidden"
  },
  body: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 20,
    rowGap: 16
  }
});

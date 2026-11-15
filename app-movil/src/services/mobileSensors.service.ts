import { Accelerometer, DeviceMotion } from "expo-sensors";
import { Platform } from "react-native";
import { sessionApi } from "../api/session.api";
import { getHttpStatus } from "../utils/httpStatus";

let accelerometerSubscription: { remove: () => void } | null = null;
let motionSubscription: { remove: () => void } | null = null;
let sensorGeneration = 0;

type SensorStartOptions = {
  onSessionMissing?: () => void;
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function stopSubscriptions() {
  sensorGeneration += 1;
  accelerometerSubscription?.remove();
  motionSubscription?.remove();
  accelerometerSubscription = null;
  motionSubscription = null;
}

export const mobileSensorsService = {
  start(sessionId: string, mobileSessionToken?: string, options?: SensorStartOptions) {
    this.stop();

    if (Platform.OS === "web") return false;

    const generation = sensorGeneration;
    const warnedSources = new Set<string>();
    const handleFailure = (source: string, error: unknown) => {
      if (generation !== sensorGeneration) return;
      if (getHttpStatus(error) === 404) {
        stopSubscriptions();
        options?.onSessionMissing?.();
        return;
      }
      if (warnedSources.has(source)) return;
      warnedSources.add(source);
      console.warn(`[mobileSensorsService] ${source} no disponible`, error);
    };

    try {
      Accelerometer.setUpdateInterval(1500);
      DeviceMotion.setUpdateInterval(1500);

      accelerometerSubscription = Accelerometer.addListener((event) => {
        void sessionApi.mobileMotion(
          sessionId,
          {
            acceleration: {
              x: safeNumber(event.x),
              y: safeNumber(event.y),
              z: safeNumber(event.z)
            }
          },
          mobileSessionToken
        ).catch((error) => handleFailure("Movimiento", error));
      });

      motionSubscription = DeviceMotion.addListener((event) => {
        const rotation = event.rotation;
        if (!rotation) return;

        void sessionApi.mobileOrientation(
          sessionId,
          {
            alpha: safeNumber(rotation.alpha),
            beta: safeNumber(rotation.beta),
            gamma: safeNumber(rotation.gamma)
          },
          mobileSessionToken
        ).catch((error) => handleFailure("Orientación", error));
      });

      return true;
    } catch (error) {
      console.warn("[mobileSensorsService] Sensores no disponibles", error);
      this.stop();
      return false;
    }
  },

  stop() {
    stopSubscriptions();
  }
};

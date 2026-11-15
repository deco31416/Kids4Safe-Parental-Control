import type { ConfigContext, ExpoConfig } from "expo/config";

declare const require: (id: string) => { existsSync: (path: string) => boolean };
const { existsSync } = require("fs");

function configuredFile(envName: string, fallbacks: string[]) {
  const configured = process.env[envName]?.trim();
  if (configured) return configured;
  return fallbacks.find((fallback) => existsSync(fallback));
}

function assertRequiredConfig(androidFile?: string, iosFile?: string) {
  if (process.env.REQUIRE_NATIVE_PUSH_CONFIG !== "true") return;
  const platform = process.env.EAS_BUILD_PLATFORM;
  if ((platform === "android" || !platform) && !androidFile) {
    throw new Error("PUSH nativo Android requiere GOOGLE_SERVICES_JSON");
  }
  if ((platform === "ios" || !platform) && !iosFile) {
    throw new Error("PUSH nativo iOS requiere GOOGLE_SERVICES_PLIST");
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleServices = configuredFile(
    "GOOGLE_SERVICES_JSON",
    ["./firebase/google-services.json", "./android/app/google-services.json"]
  );
  const iosGoogleServices = configuredFile(
    "GOOGLE_SERVICES_PLIST",
    ["./firebase/GoogleService-Info.plist", "./ios/GoogleService-Info.plist"]
  );
  assertRequiredConfig(androidGoogleServices, iosGoogleServices);

  return {
    ...config,
    android: {
      ...config.android,
      ...(androidGoogleServices ? { googleServicesFile: androidGoogleServices } : {})
    },
    ios: {
      ...config.ios,
      ...(iosGoogleServices ? { googleServicesFile: iosGoogleServices } : {})
    }
  } as ExpoConfig;
};

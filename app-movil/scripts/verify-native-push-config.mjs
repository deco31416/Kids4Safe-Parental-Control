import { existsSync, readFileSync } from "node:fs";

const expectedId = "com.bloomprotect.mobile";
const required = process.env.REQUIRE_NATIVE_PUSH_CONFIG === "true";
const firstExisting = (paths) => paths.find((path) => existsSync(path)) || paths[0];
const androidPath = process.env.GOOGLE_SERVICES_JSON || firstExisting([
  "./firebase/google-services.json",
  "./android/app/google-services.json"
]);
const iosPath = process.env.GOOGLE_SERVICES_PLIST || firstExisting([
  "./firebase/GoogleService-Info.plist",
  "./ios/GoogleService-Info.plist"
]);
const problems = [];

function verifyAndroid() {
  if (!existsSync(androidPath)) {
    problems.push(`Android: falta ${androidPath}`);
    return;
  }

  const config = JSON.parse(readFileSync(androidPath, "utf8"));
  const packages = (config.client || [])
    .map((client) => client?.client_info?.android_client_info?.package_name)
    .filter(Boolean);
  if (!packages.includes(expectedId)) {
    problems.push(`Android: package esperado ${expectedId}`);
  }
}

function verifyIos() {
  if (!existsSync(iosPath)) {
    problems.push(`iOS: falta ${iosPath}`);
    return;
  }

  const plist = readFileSync(iosPath, "utf8");
  if (!plist.includes(`<string>${expectedId}</string>`)) {
    problems.push(`iOS: bundle esperado ${expectedId}`);
  }
}

verifyAndroid();
verifyIos();

if (problems.length === 0) {
  console.log("PUSH nativo: configuración cliente Firebase válida");
  process.exit(0);
}

console.log(`PUSH nativo: ${problems.join("; ")}`);
process.exit(required ? 1 : 0);

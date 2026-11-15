import { PermissionsAndroid, Platform } from "react-native";
import type { BleManager, Device, State } from "react-native-ble-plx";

export type BloomBandDevice = {
  id: string;
  name: string;
  connected: boolean;
  source: "web-bluetooth" | "native-ble";
};

const BLOOM_DEVICE_PREFIXES = ["Bloom", "BloomBand", "Bloom Band"];
const SCAN_TIMEOUT_MS = 12000;

let bleManager: BleManager | null = null;

async function getBleManager() {
  if (Platform.OS === "web") return null;
  if (!bleManager) {
    const { BleManager } = await import("react-native-ble-plx");
    bleManager = new BleManager();
  }

  return bleManager;
}

function getDeviceName(device: Device) {
  return device.name || device.localName || "Dispositivo Bluetooth";
}

function isBloomDevice(device: Device) {
  const name = getDeviceName(device);
  return BLOOM_DEVICE_PREFIXES.some((prefix) => name.toLowerCase().startsWith(prefix.toLowerCase()));
}

async function requestAndroidBluetoothPermissions() {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    ]);

    return Object.values(result).every((status) => status === PermissionsAndroid.RESULTS.GRANTED);
  }

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function waitForPoweredOn(manager: BleManager) {
  const currentState = await manager.state();
  if (currentState === "PoweredOn") return;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error("Bluetooth esta apagado o no disponible."));
    }, 8000);

    const subscription = manager.onStateChange((state: State) => {
      if (state === "PoweredOn") {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    }, true);
  });
}

async function requestNativeBloomBand(): Promise<BloomBandDevice> {
  const permissionsGranted = await requestAndroidBluetoothPermissions();
  if (!permissionsGranted) {
    throw new Error("Permiso Bluetooth denegado. Actívalo para vincular el accesorio.");
  }

  const manager = await getBleManager();
  if (!manager) {
    throw new Error("Bluetooth nativo no esta disponible en esta plataforma.");
  }

  await waitForPoweredOn(manager);

  const device = await new Promise<Device>((resolve, reject) => {
    let fallbackDevice: Device | null = null;
    const timeout = setTimeout(() => {
      manager.stopDeviceScan();
      if (fallbackDevice) {
        resolve(fallbackDevice);
        return;
      }
      reject(new Error("No encontramos un accesorio Bluetooth compatible cercano. Verifica que esté encendido y en modo de vinculación."));
    }, SCAN_TIMEOUT_MS);

    manager.startDeviceScan(null, { allowDuplicates: false }, (error, scannedDevice) => {
      if (error) {
        clearTimeout(timeout);
        manager.stopDeviceScan();
        reject(new Error(error.message || "No fue posible iniciar la busqueda Bluetooth."));
        return;
      }

      if (!scannedDevice) return;
      if (!fallbackDevice && getDeviceName(scannedDevice) !== "Dispositivo Bluetooth") {
        fallbackDevice = scannedDevice;
      }

      if (isBloomDevice(scannedDevice)) {
        clearTimeout(timeout);
        manager.stopDeviceScan();
        resolve(scannedDevice);
      }
    });
  });

  const connectedDevice = await manager.connectToDevice(device.id, { timeout: 10000 }).catch(() => device);
  await connectedDevice.discoverAllServicesAndCharacteristics().catch(() => connectedDevice);

  return {
    id: connectedDevice.id,
    name: getDeviceName(connectedDevice),
    connected: await connectedDevice.isConnected(),
    source: "native-ble"
  };
}

export const bluetoothService = {
  isAvailable() {
    if (Platform.OS === "web") {
      return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
    }

    return true;
  },

  async requestBloomBand(): Promise<BloomBandDevice> {
    if (Platform.OS !== "web") {
      return requestNativeBloomBand();
    }

    if (!navigator.bluetooth) {
      throw new Error("Este navegador no soporta Web Bluetooth. Prueba Chrome o Edge desde una conexión HTTPS.");
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: BLOOM_DEVICE_PREFIXES.map((namePrefix) => ({ namePrefix })),
      optionalServices: ["battery_service", "device_information"]
    });

    let connected = false;
    if (device.gatt?.connect) {
      try {
        await device.gatt.connect();
        connected = Boolean(device.gatt.connected);
      } catch {
        connected = false;
      }
    }

    return {
      id: device.id,
      name: device.name || "Dispositivo Bluetooth",
      connected,
      source: "web-bluetooth"
    };
  }
};

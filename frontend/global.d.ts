/**
 * 🌐 Definiciones de Tipos Globales para APIs del Navegador
 * 
 * Extiende las definiciones de TypeScript para incluir APIs modernas del navegador
 */

// Bluetooth API
declare interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

declare interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

declare interface BluetoothRemoteGATTService {
  device: BluetoothDevice;
  uuid: string;
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

declare interface BluetoothRemoteGATTCharacteristic {
  service?: BluetoothRemoteGATTService;
  uuid: string;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

declare type BluetoothServiceUUID = string | number;
declare type BluetoothCharacteristicUUID = string | number;

declare interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

declare interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
}

declare interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
}

// USB API
declare interface USBDevice {
  deviceClass: number;
  deviceSubclass: number;
  deviceProtocol: number;
  productId: number;
  vendorId: number;
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
  configuration?: USBConfiguration;
  configurations: USBConfiguration[];
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

declare interface USBConfiguration {
  configurationValue: number;
  configurationName?: string;
  interfaces: USBInterface[];
}

declare interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: USBAlternateInterface[];
}

declare interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName?: string;
  endpoints: USBEndpoint[];
}

declare interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
}

declare interface USBInTransferResult {
  data?: DataView;
  status: 'ok' | 'stall' | 'babble';
}

declare interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall';
}

declare interface USBDeviceRequestOptions {
  filters?: USBDeviceFilter[];
}

declare interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

declare interface USB extends EventTarget {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
}

// MIDI API
declare interface MIDIAccess extends EventTarget {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  onstatechange: ((this: MIDIAccess, ev: Event) => any) | null;
  sysexEnabled: boolean;
}

declare interface MIDIInputMap {
  size: number;
  keys(): IterableIterator<string>;
  values(): IterableIterator<MIDIInput>;
  entries(): IterableIterator<[string, MIDIInput]>;
  get(key: string): MIDIInput | undefined;
  has(key: string): boolean;
  forEach(callbackfn: (value: MIDIInput, key: string, parent: MIDIInputMap) => void, thisArg?: any): void;
}

declare interface MIDIOutputMap {
  size: number;
  keys(): IterableIterator<string>;
  values(): IterableIterator<MIDIOutput>;
  entries(): IterableIterator<[string, MIDIOutput]>;
  get(key: string): MIDIOutput | undefined;
  has(key: string): boolean;
  forEach(callbackfn: (value: MIDIOutput, key: string, parent: MIDIOutputMap) => void, thisArg?: any): void;
}

declare interface MIDIPort extends EventTarget {
  id: string;
  manufacturer?: string;
  name?: string;
  type: 'input' | 'output';
  version?: string;
  state: 'disconnected' | 'connected';
  connection: 'open' | 'closed' | 'pending';
  onstatechange: ((this: MIDIPort, ev: Event) => any) | null;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

declare interface MIDIInput extends MIDIPort {
  type: 'input';
  onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
}

declare interface MIDIOutput extends MIDIPort {
  type: 'output';
  send(data: Uint8Array, timestamp?: number): void;
  clear(): void;
}

declare interface MIDIMessageEvent extends Event {
  data: Uint8Array;
}

declare interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

// Device Motion & Orientation
declare interface DeviceMotionEventAcceleration {
  x: number | null;
  y: number | null;
  z: number | null;
}

declare interface DeviceMotionEventRotationRate {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

// Screen Capture API
declare interface DisplayMediaStreamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

// Storage API
declare interface StorageManager {
  persisted(): Promise<boolean>;
  persist(): Promise<boolean>;
  estimate(): Promise<StorageEstimate>;
}

declare interface StorageEstimate {
  usage?: number;
  quota?: number;
}

// Wake Lock API
declare interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

declare interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
}

// Network Information API
declare interface NetworkInformation extends EventTarget {
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlinkMax?: number;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => any) | null;
}

// Permissions API (extendido)
declare type PermissionName =
  | 'geolocation'
  | 'notifications'
  | 'push'
  | 'midi'
  | 'camera'
  | 'microphone'
  | 'speaker'
  | 'device-info'
  | 'background-sync'
  | 'bluetooth'
  | 'persistent-storage'
  | 'ambient-light-sensor'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'clipboard-read'
  | 'clipboard-write'
  | 'display-capture';

// Extend existing interfaces
declare interface Navigator {
  bluetooth?: Bluetooth;
  usb?: USB;
  requestMIDIAccess?(options?: MIDIOptions): Promise<MIDIAccess>;
  wakeLock?: WakeLock;
  storage?: StorageManager;
  deviceMemory?: number;
  connection?: NetworkInformation;
}

declare interface MediaDevices {
  getDisplayMedia(constraints?: DisplayMediaStreamOptions): Promise<MediaStream>;
}

declare interface Window {
  DeviceMotionEvent?: {
    new(type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEvent;
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  DeviceOrientationEvent?: {
    new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
}

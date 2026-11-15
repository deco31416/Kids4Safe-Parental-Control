/**
 * 🌐 Definiciones de Tipos para APIs del Navegador
 * 
 * Extiende las definiciones de TypeScript para incluir APIs modernas del navegador
 * que no están completamente tipadas en @types/node
 */

// Bluetooth API
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  device: BluetoothDevice;
  uuid: string;
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  service?: BluetoothRemoteGATTService;
  uuid: string;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

type BluetoothServiceUUID = string | number;
type BluetoothCharacteristicUUID = string | number;

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
}

// USB API
interface USBDevice {
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

interface USBConfiguration {
  configurationValue: number;
  configurationName?: string;
  interfaces: USBInterface[];
}

interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName?: string;
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
}

interface USBInTransferResult {
  data?: DataView;
  status: 'ok' | 'stall' | 'babble';
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall';
}

interface USBDeviceRequestOptions {
  filters?: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USB extends EventTarget {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
}

// MIDI API
interface MIDIAccess extends EventTarget {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  onstatechange: ((this: MIDIAccess, ev: Event) => any) | null;
  sysexEnabled: boolean;
}

interface MIDIInputMap {
  size: number;
  keys(): IterableIterator<string>;
  values(): IterableIterator<MIDIInput>;
  entries(): IterableIterator<[string, MIDIInput]>;
  get(key: string): MIDIInput | undefined;
  has(key: string): boolean;
  forEach(callbackfn: (value: MIDIInput, key: string, parent: MIDIInputMap) => void, thisArg?: any): void;
}

interface MIDIOutputMap {
  size: number;
  keys(): IterableIterator<string>;
  values(): IterableIterator<MIDIOutput>;
  entries(): IterableIterator<[string, MIDIOutput]>;
  get(key: string): MIDIOutput | undefined;
  has(key: string): boolean;
  forEach(callbackfn: (value: MIDIOutput, key: string, parent: MIDIOutputMap) => void, thisArg?: any): void;
}

interface MIDIPort extends EventTarget {
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

interface MIDIInput extends MIDIPort {
  type: 'input';
  onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
}

interface MIDIOutput extends MIDIPort {
  type: 'output';
  send(data: Uint8Array, timestamp?: number): void;
  clear(): void;
}

interface MIDIMessageEvent extends Event {
  data: Uint8Array;
}

interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

// Device Motion & Orientation
interface DeviceMotionEventAcceleration {
  x: number | null;
  y: number | null;
  z: number | null;
}

interface DeviceMotionEventRotationRate {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

// Screen Capture API
interface MediaDevices {
  getDisplayMedia(constraints?: DisplayMediaStreamOptions): Promise<MediaStream>;
}

interface DisplayMediaStreamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

// Storage API
interface StorageManager {
  persisted(): Promise<boolean>;
  persist(): Promise<boolean>;
  estimate(): Promise<StorageEstimate>;
}

interface StorageEstimate {
  usage?: number;
  quota?: number;
}

// Wake Lock API
interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
}

// Extend Navigator interface
interface Navigator {
  bluetooth?: Bluetooth;
  usb?: USB;
  requestMIDIAccess?(options?: MIDIOptions): Promise<MIDIAccess>;
  wakeLock?: WakeLock;
  storage?: StorageManager;
  deviceMemory?: number;
  connection?: NetworkInformation;
}

// Network Information API
interface NetworkInformation extends EventTarget {
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlinkMax?: number;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => any) | null;
}

// Permissions API (extendido)
interface PermissionDescriptor {
  name: PermissionName;
}

type PermissionName =
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

// Extend Window interface
interface Window {
  DeviceMotionEvent?: {
    new(type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEvent;
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  DeviceOrientationEvent?: {
    new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
}

export {};

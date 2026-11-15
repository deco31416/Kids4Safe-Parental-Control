type BluetoothDeviceLike = {
  id: string;
  name?: string;
  gatt?: {
    connected?: boolean;
    connect: () => Promise<unknown>;
    disconnect?: () => void;
  };
};

type BluetoothRequestDeviceOptionsLike = {
  filters?: Array<{
    name?: string;
    namePrefix?: string;
    services?: string[];
  }>;
  optionalServices?: string[];
  acceptAllDevices?: boolean;
};

interface Navigator {
  bluetooth?: {
    requestDevice: (options: BluetoothRequestDeviceOptionsLike) => Promise<BluetoothDeviceLike>;
  };
}

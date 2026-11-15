export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
}

export interface AllPermissionsStatus {
  camera: PermissionStatus;
  cameraRear: PermissionStatus;
  microphone: PermissionStatus;
  geolocation: PermissionStatus;
  notifications: PermissionStatus;
  screenCapture: PermissionStatus;
  deviceMotion: PermissionStatus;
  deviceOrientation: PermissionStatus;
  clipboard: PermissionStatus;
  bluetooth: PermissionStatus;
  usb: PermissionStatus;
  midi: PermissionStatus;
  persistentStorage: PermissionStatus;
}

export const pendingPermissionStatus = (): PermissionStatus => ({
  granted: false,
  denied: false,
  prompt: true,
});

import type { AllPermissionsStatus } from '@/lib/permissions-manager';

type EssentialPermissions = {
  camera: MediaStream | null;
  microphone: MediaStream | null;
  geolocation: GeolocationPosition | null;
  notifications: NotificationPermission;
  screenCapture: MediaStream | null;
};

const pending = { granted: false, denied: false, prompt: true };
const fromNullable = (value: unknown) =>
  value ? { granted: true, denied: false, prompt: false } : { granted: false, denied: true, prompt: false };

export function essentialPermissionsToStatus(essential: EssentialPermissions): AllPermissionsStatus {
  return {
    camera: fromNullable(essential.camera),
    cameraRear: pending,
    microphone: fromNullable(essential.microphone),
    geolocation: fromNullable(essential.geolocation),
    notifications: {
      granted: essential.notifications === 'granted',
      denied: essential.notifications === 'denied',
      prompt: essential.notifications === 'default',
    },
    screenCapture: fromNullable(essential.screenCapture),
    deviceMotion: pending,
    deviceOrientation: pending,
    clipboard: pending,
    bluetooth: pending,
    usb: pending,
    midi: pending,
    persistentStorage: pending,
  };
}

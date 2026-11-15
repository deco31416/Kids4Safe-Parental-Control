export type EmergencyPermissionStatus = {
  location: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  bluetooth: boolean;
};

export type EmergencyActivation = {
  sessionId: string;
  permissions: EmergencyPermissionStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
};

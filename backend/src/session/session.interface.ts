export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  os?: string;
  deviceType?: string;
  screenResolution: string;
  language: string;
  timezone: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface SessionState {
  sessionId: string;
  qrId: string;
  qrName: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
  deviceInfo: DeviceInfo | null;
  location: LocationData | null;
  permissions: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
    location: boolean;
  };
  streams: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
  };
  ipAddress: string;
  lastSeen: number;
  createdAt: number;
}

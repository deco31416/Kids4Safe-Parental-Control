/**
 * Capability Matrix types para Backend
 */

export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'unknown';
export type OSFamily = 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown';
export type BrowserFamily = 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Unknown';

export interface CameraCapability {
  available: boolean;
  modes: ('front' | 'back' | 'single')[];
  count: number;
}

export interface AudioCapability {
  microphone: boolean;
  speaker: boolean;
}

export interface ScreenCapability {
  canCapture: boolean;
  limitations: string[];
}

export interface GeolocationCapability {
  available: boolean;
  accuracy: 'high' | 'medium' | 'low';
}

export interface BackgroundCapability {
  maintainsPermissions: boolean;
  serviceWorker: boolean;
}

export interface PlatformConstraints {
  autoplayBlocked: boolean;
  requiresSecureContext: boolean;
  permissionsVolatile: boolean;
  noScreenCapture: boolean;
  maxConcurrentStreams: number;
}

export interface ClientCapabilities {
  deviceType: DeviceType;
  os: {
    family: OSFamily;
    version?: string;
  };
  browser: {
    family: BrowserFamily;
    version?: string;
  };
  camera: CameraCapability;
  audio: AudioCapability;
  screen: ScreenCapability;
  geolocation: GeolocationCapability;
  background: BackgroundCapability;
  constraints: PlatformConstraints;
  hardware: {
    cores: number | null;
    memory: number | null;
    screenResolution: string;
  };
  confidence: number;
  detectedAt: number;
}

// ===== QR Types =====
export interface QRConfig {
  id: string;
  name: string;
  isActive: boolean;
  config?: {
    redirect_url: string;
    permissions?: {
      camera?: boolean;
      microphone?: boolean;
      location?: boolean;
      screen?: boolean;
    };
    time_limits?: {
      max_duration?: number;
      expires_at?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// ===== Session Types =====
export interface Session {
  id: string;
  qrId: string;
  name: string;
  ip: string;
  status: 'active' | 'paused' | 'completed';
  deviceInfo?: DeviceInfo;
  location?: Location;
  permissions?: Permissions;
  streams?: StreamStatus;
  createdAt: string;
  updatedAt: string;
  lastHeartbeat?: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  screenResolution: string;
  language: string;
  timezone: string;
  [key: string]: any;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface Permissions {
  camera?: boolean;
  microphone?: boolean;
  location?: boolean;
  screen?: boolean;
}

export interface StreamStatus {
  camera?: boolean;
  screen?: boolean;
  audio?: boolean;
}

// ===== API Response Types =====
export interface ApiSuccessResponse<T = any> {
  ok: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  statusCode?: number;
  requestId?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

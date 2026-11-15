/**
 * Eventos WebSocket Normalizados
 * Sistema Kids4Safe - monitoreo de sesiones
 */

// Base event structure
export interface BaseEvent {
  type: string;
  sessionId: string;
  timestamp: number;
  payload: Record<string, any>;
}

// ==================== EVENTOS DE SESIÓN ====================

export interface SessionStartedEvent extends BaseEvent {
  type: 'session.started';
  payload: {
    qrId: string;
    ip: string;
    device: string;
    userAgent: string;
  };
}

export interface SessionHeartbeatEvent extends BaseEvent {
  type: 'session.heartbeat';
  payload: {
    status: 'active' | 'paused';
  };
}

export interface SessionEndedEvent extends BaseEvent {
  type: 'session.ended';
  payload: {
    reason: 'user_closed' | 'timeout' | 'admin_terminated' | 'error';
  };
}

// ==================== EVENTOS DE PERMISOS ====================

export type PermissionType = 'camera' | 'microphone' | 'screen' | 'location';
export type PermissionStatus = 'granted' | 'denied' | 'revoked';

export interface PermissionEvent extends BaseEvent {
  type: `permission.${PermissionType}.${PermissionStatus}`;
  payload: {
    permission: PermissionType;
    status: PermissionStatus;
    metadata?: Record<string, any>;
  };
}

export interface PermissionCameraGrantedEvent extends BaseEvent {
  type: 'permission.camera.granted';
  payload: {
    permission: 'camera';
    status: 'granted';
    metadata?: {
      facing?: 'user' | 'environment';
    };
  };
}

export interface PermissionScreenGrantedEvent extends BaseEvent {
  type: 'permission.screen.granted';
  payload: {
    permission: 'screen';
    status: 'granted';
    metadata?: {
      displaySurface?: 'monitor' | 'window' | 'application' | 'browser';
    };
  };
}

export interface PermissionLocationGrantedEvent extends BaseEvent {
  type: 'permission.location.granted';
  payload: {
    permission: 'location';
    status: 'granted';
    metadata?: {
      accuracy?: 'high' | 'low';
    };
  };
}

// ==================== EVENTOS DE MONITOREO VISUAL ====================

export interface ScreenSnapshotEvent extends BaseEvent {
  type: 'screen.snapshot';
  payload: {
    imageId?: string;
    imageData?: string; // Base64 JPEG
    width: number;
    height: number;
    format: 'jpeg' | 'png';
    quality?: number;
  };
}

export interface CameraFrameEvent extends BaseEvent {
  type: 'camera.frame';
  payload: {
    frameId?: string;
    imageData?: string; // Base64 JPEG
    width: number;
    height: number;
  };
}

// ==================== EVENTOS DE UBICACIÓN ====================

export interface LocationUpdateEvent extends BaseEvent {
  type: 'location.update';
  payload: {
    lat: number;
    lng: number;
    accuracy: number;
    altitude?: number;
    speed?: number;
    heading?: number;
  };
}

// ==================== EVENTOS DE AUDIO ====================

export interface AudioStreamEvent extends BaseEvent {
  type: 'audio.stream';
  payload: {
    audioData: Blob | ArrayBuffer | string; // Puede ser Blob, ArrayBuffer o Base64
    duration?: number;
    format?: string;
  };
}

// ==================== EVENTOS DE PÁGINA ====================

export interface PageNavigationEvent extends BaseEvent {
  type: 'page.navigation';
  payload: {
    url: string;
    title?: string;
  };
}

export interface PageFocusEvent extends BaseEvent {
  type: 'page.focus' | 'page.blur';
  payload: {
    focused: boolean;
  };
}

// ==================== EVENTOS DE RIESGO ====================

export interface RiskFlagEvent extends BaseEvent {
  type: 'risk.flag';
  payload: {
    flag: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, any>;
  };
}

// ==================== UNION TYPE ====================

export type WebSocketEvent =
  | SessionStartedEvent
  | SessionHeartbeatEvent
  | SessionEndedEvent
  | PermissionEvent
  | PermissionCameraGrantedEvent
  | PermissionScreenGrantedEvent
  | PermissionLocationGrantedEvent
  | ScreenSnapshotEvent
  | CameraFrameEvent
  | LocationUpdateEvent
  | AudioStreamEvent
  | PageNavigationEvent
  | PageFocusEvent
  | RiskFlagEvent;

// ==================== HELPERS ====================

export function isSessionEvent(event: BaseEvent): event is SessionStartedEvent | SessionHeartbeatEvent | SessionEndedEvent {
  return event.type.startsWith('session.');
}

export function isPermissionEvent(event: BaseEvent): event is PermissionEvent {
  return event.type.startsWith('permission.');
}

export function isMonitoringEvent(event: BaseEvent): event is ScreenSnapshotEvent | CameraFrameEvent | AudioStreamEvent {
  return ['screen.snapshot', 'camera.frame', 'audio.stream'].includes(event.type);
}

export function isLocationEvent(event: BaseEvent): event is LocationUpdateEvent {
  return event.type === 'location.update';
}

export function isRiskEvent(event: BaseEvent): event is RiskFlagEvent {
  return event.type === 'risk.flag';
}

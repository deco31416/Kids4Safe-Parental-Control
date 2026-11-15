/**
 * Session State Types
 * Defines the states and transitions for a session
 */

export type SessionState =
  | 'initializing'    // Loading session config
  | 'requesting-permissions' // Requesting device permissions
  | 'active'          // Session active, streaming
  | 'paused'          // Session paused by user or system
  | 'ended'           // Session ended normally
  | 'error';          // Error state

export interface SessionInfo {
  sessionId: string;
  qrId: string;
  redirectUrl: string;
  qrPolicy: QRPolicy | null;
}

export interface QRPolicy {
  policyType: 'STANDARD' | 'STRICT' | 'MINIMAL';
  permissionsRequired: string[];
  permissionsOptional: string[];
  maxUses?: number;
  ttlSeconds?: number;
}

export interface StreamRefs {
  camera: MediaStream | null;
  screen: MediaStream | null;
  microphone: MediaStream | null;
}

export interface SessionError {
  type: 'permission' | 'network' | 'policy' | 'unknown';
  message: string;
}

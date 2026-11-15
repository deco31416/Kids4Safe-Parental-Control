/**
 * Publisher Types
 * Union types y interfaces para el Stream Publisher
 */

export type PublisherState =
  | 'initializing'
  | 'consent-required'
  | 'connecting'
  | 'active'
  | 'error';

export interface JoinResponse {
  sessionId: string;
  publisherToken?: string;
  browserDeviceId?: string;
  reconnected?: boolean;
  destinationUrl: string | null;
  policy: {
    permissionsRequired: string[];
    permissionsOptional: string[];
    allowOpenDestination: boolean;
    purposeText: string;
    consentVersion: string;
  };
  qrName: string;
}

export interface StreamState {
  camera: boolean;
  mic: boolean;
  screen: boolean;
  location: boolean;
}

export interface PublisherError {
  type: 'join' | 'stream' | 'location' | 'connection';
  message: string;
}

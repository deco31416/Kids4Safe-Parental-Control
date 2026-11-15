import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true })
  qrId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ index: true })
  browserDeviceId?: string;

  @Prop({ default: 'qr' })
  source?: 'qr' | 'mobile-app' | 'frontend' | 'admin';

  @Prop({ type: Object })
  mobile?: {
    unitId?: string;
    deviceLabel?: string;
    appVersion?: string;
    platform?: string;
    activationMode?: 'direct' | 'linked';
    appState?: 'active' | 'background' | 'inactive';
    lastLifecycleSource?: string;
    firstSeenAt?: Date;
    lastSeenAt?: Date;
    bluetooth?: {
      deviceId?: string;
      deviceName?: string;
      connected?: boolean;
      source?: string;
      updatedAt?: Date;
    };
    notificationToken?: {
      token?: string;
      provider?: string;
      updatedAt?: Date;
    };
    profile?: {
      securityId?: string;
      fullName?: string;
      phone?: string;
      emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
      };
      bloodType?: string;
      avatarUri?: string;
      avatarThumbnailUrl?: string;
    };
    sessionTokenHash?: string;
  };

  @Prop({ type: Object })
  subject?: {
    subjectId?: string;
    displayName?: string;
    photoUrl?: string;
    photoThumbnailUrl?: string;
    assignedAt?: Date;
    assignedBy?: {
      adminId?: string;
      username?: string;
    };
  };

  @Prop({ default: 'active' })
  status: string; // active, paused, completed, expired

  @Prop({ type: Object })
  deviceInfo: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
    type?: string; // mobile, desktop, tablet
    hardwareConcurrency?: number;
    capabilities?: Record<string, boolean>;
    collectedAt?: Date;
    screenResolution?: {
      width: number;
      height: number;
    };
  };

  @Prop({ type: Object })
  capabilities: {
    deviceType?: string;
    os?: { family: string; version?: string };
    browser?: { family: string; version?: string };
    camera?: {
      available: boolean;
      modes: string[];
      count: number;
    };
    audio?: {
      microphone: boolean;
      speaker: boolean;
    };
    screen?: {
      canCapture: boolean;
      limitations: string[];
    };
    geolocation?: {
      available: boolean;
      accuracy: string;
    };
    background?: {
      maintainsPermissions: boolean;
      serviceWorker: boolean;
    };
    constraints?: Record<string, any>;
    hardware?: {
      cores: number | null;
      memory: number | null;
      screenResolution: string;
    };
    confidence?: number;
    detectedAt?: number;
  };

  @Prop({ type: Object })
  location: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    city?: string;
    country?: string;
    source?: string; // gps, ip
    confidence?: number;
    timestamp?: Date;
  };

  @Prop({ type: Object })
  permissions: {
    camera?: boolean;
    microphone?: boolean;
    screen?: boolean;
    location?: boolean;
  };

  @Prop({ type: Object })
  streams: {
    camera?: boolean;
    microphone?: boolean;
    screen?: boolean;
  };

  @Prop()
  ipAddress: string;

  @Prop()
  lastSeen: Date;

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  sessionHash?: string;

  @Prop()
  publisherTokenHash?: string;

  @Prop({ type: [String], default: [] })
  publisherTokenHashes?: string[];

  @Prop({ type: [String], default: [] })
  screenshots?: string[];

  @Prop({ type: [Object], default: [] })
  recordings?: Array<{
    url: string;
    type: string;
    duration?: number;
    size?: number;
    timestamp: Date;
  }>;

  @Prop({ type: [Object], default: [] })
  consents: Array<{
    accepted: boolean;
    consentVersion: string;
    permissions: string[];
    purpose?: string;
    timestamp: Date;
  }>;

  @Prop({ type: Object })
  metadata: {
    lastOrientation?: {
      alpha: number;
      beta: number;
      gamma: number;
      timestamp: Date;
    };
    lastMotion?: {
      acceleration?: { x: number; y: number; z: number };
      rotationRate?: any;
      timestamp: Date;
    };
    [key: string]: any;
  };

  @Prop({ type: Object })
  contentRedirect?: {
    contentUrl?: string;
    redirectedAt?: number;
  };

  @Prop({ type: Object })
  policyDecision?: {
    allow_camera?: boolean;
    allow_mic?: boolean;
    allow_screen?: boolean;
    require_screen?: boolean;
    allow_location?: boolean;
    allow_continue?: boolean;
    required_permissions?: string[];
    reason?: string;
    evaluatedAt?: Date;
    source?: 'microservice' | 'local-fallback';
  };

  @Prop({ type: Object })
  geoAssessment?: {
    estimatedCountry: string;
    estimatedRegion?: string;
    estimatedCity?: string;
    estimatedLat?: number;
    estimatedLng?: number;
    accuracyRadiusKm: number;
    confidenceScore: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    signalsUsed: string[];
    flags: string[];
    method: 'ip-only' | 'multi-signal' | 'trilateration' | 'ml-enhanced';
    processedAt: Date;
  };

  // 🆕 Historial de assessments (para detectar saltos geográficos)
  @Prop({ type: [Object], default: [] })
  geoHistory?: Array<{
    estimatedLat?: number;
    estimatedLng?: number;
    estimatedCity?: string;
    confidenceScore: number;
    method: string;
    processedAt: Date;
  }>;

  // 🆕 Device Fingerprint (para detectar múltiples sesiones mismo usuario)
  @Prop({ type: String, index: true })
  deviceFingerprint?: string; // SHA-256 hash de userAgent+screen+timezone+language+plugins

  // 🆕 Sesiones correlacionadas (mismo fingerprint en 24h)
  @Prop({ type: [String], default: [] })
  correlatedSessionIds?: string[]; // Array de sessionIds correlacionados

  // 🆕 Flags de correlación
  @Prop({ type: Object })
  correlationFlags?: {
    isCorrelated: boolean; // true si se detectó correlación
    correlationCount: number; // Número de sesiones correlacionadas
    correlationRisk: 'low' | 'medium' | 'high' | 'critical'; // low: 2, medium: 3-4, high: 5-7, critical: 8+
    firstDetectedAt?: Date;
    lastCheckedAt?: Date;
  };

  // ✅ P0 FIX: TTL para auto-cleanup
  @Prop()
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Índices para búsquedas eficientes
SessionSchema.index({ qrId: 1 });
SessionSchema.index({ sessionId: 1 });
SessionSchema.index({ qrId: 1, browserDeviceId: 1, status: 1 });
SessionSchema.index({ source: 1, status: 1 });
SessionSchema.index({ 'mobile.unitId': 1, status: 1 });
SessionSchema.index({ 'subject.subjectId': 1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ createdAt: -1 });
// deviceFingerprint ya tiene index:true en @Prop, no duplicar aquí

// ✅ P0 FIX: TTL index para auto-delete
// Sessions activas: 24h
// Sessions completadas: 30 días
SessionSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    name: 'sessions_ttl',
  }
);

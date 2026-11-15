export interface QRCode {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
  isActive: boolean;
  totalScans: number;
  activeSessions: number;
  
  // 🎯 Destination URL (para "embudo" a otra página)
  destinationUrl?: string; // URL a donde redirigir después de permisos
  
  // Session Gated Content Configuration
  config?: {
    redirect_url?: string;          // URL del contenido externo (alias de destinationUrl)
    session_duration_max?: number;   // Duración máxima en minutos
    auto_redirect?: boolean;         // Auto-redirigir después de permisos
    allowed_countries?: string[];    // ISO codes permitidos
    require_camera?: boolean;
    require_microphone?: boolean;
    require_screen?: boolean;
    require_location?: boolean;
    
    // 📸 Configuración de capturas automáticas
    screenshotConfig?: {
      captureScreen: boolean;         // Capturar pantalla
      captureCamera: boolean;         // Capturar cámara
      screenInterval: number;         // Intervalo en segundos (pantalla)
      cameraInterval: number;         // Intervalo en segundos (cámara)
      maxPerSession?: number;         // Máximo de capturas por sesión
    };
    
    // 🎬 Phase 6: Capture Policy Configurable
    capturePolicy?: {
      // Intervalos en milisegundos
      intervals?: {
        camera?: number;      // Default: 15000 (15s)
        screen?: number;      // Default: 15000
        microphone?: number;  // Default: 5000 (5s)
        gps?: number;         // Default: 30000 (30s)
      };
      
      // Solo capturar si detecta cambios
      onlyIfChanged?: boolean;  // Default: true
      
      // Umbrales de cambio para activar captura
      changeThresholds?: {
        gpsMeters?: number;         // Default: 10m
        imageDiffPercent?: number;  // Default: 5%
        audioLevelDelta?: number;   // Default: 10dB
      };
      
      // Sobrescrituras por tipo de device
      perDeviceOverrides?: {
        mobile?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
        tablet?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
        desktop?: Partial<{ camera: number; screen: number; microphone: number; gps: number }>;
      };
      
      // Política predefinida a usar
      policyPreset?: 'default' | 'high-frequency' | 'low-power' | 'custom';
    };
  };
  
  // 🔐 Políticas especiales (QR "tipos")
  policyType?: 'STANDARD' | 'KYC_STRICT' | 'SCREEN_ONLY' | 'LOCATION_REQUIRED' | 'ONE_TIME' | 'MULTI_USE';
  
  // Políticas de compliance
  policies?: {
    no_recording_countries?: string[];
    no_audio_countries?: string[];
    business_hours_only?: boolean;
    business_start_hour?: number;
    business_end_hour?: number;
    max_session_duration?: number;
    
    // 🆕 Políticas especiales avanzadas
    permissionsRequired?: Array<'camera' | 'mic' | 'screen' | 'location' | 'orientation'>;
    permissionsOptional?: Array<'camera' | 'mic' | 'screen' | 'location' | 'orientation'>;
    ttlSeconds?: number;              // Expira en X segundos
    maxUses?: number;                 // 1 = one-time, -1 = unlimited
    allowOpenDestination?: boolean;   // Permitir abrir destino en otra pestaña
    purposeText?: string;             // Texto legal para consent modal
    consentVersion?: string;          // Versión del texto legal
  };
  
  // 🎯 Expiration metadata
  expiresAt?: number; // Timestamp de expiración
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
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
  deviceInfo: DeviceInfo;
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
  
  // Session Gated Content metadata
  contentRedirect?: {
    redirected: boolean;
    redirectedAt?: number;
    contentUrl?: string;
  };
}

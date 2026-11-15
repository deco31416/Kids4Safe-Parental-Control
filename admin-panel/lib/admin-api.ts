/**
 * Admin API Layer
 * Capa única de acceso al backend para el Admin Panel
 * Centraliza todas las llamadas, seguridad y manejo de errores
 */

import { notifyAdminSessionEnded } from './emergency-alert-events';
import { AdminPermissionError } from './admin-access';
import type { HealthResponse } from './system-health';
import { AdminNetworkError, fetchAdminResponse } from './admin-request';
import { AdminSessionExpiredError, getAdminSessionToken, invalidateAdminSession, isAdminSessionExpiredError } from './admin-auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API_KEY = typeof window === 'undefined' ? process.env.ADMIN_API_KEY : undefined;

if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado en variables de entorno');
}

if (typeof window === 'undefined' && !API_KEY) {
  console.warn('ADMIN_API_KEY no configurado - las peticiones pueden fallar');
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Función centralizada para todas las peticiones al backend
 * Maneja autenticación, headers y errores de forma consistente
 */
async function adminFetch<T>(path: string, { timeoutMs, ...options }: FetchOptions = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  
  const token = getAdminSessionToken();

  if (typeof window !== 'undefined' && !token) {
    invalidateAdminSession(token);
    throw new AdminSessionExpiredError();
  }

  try {
    const res = await fetchAdminResponse(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'x-api-key': API_KEY }),
        'x-request-id': crypto.randomUUID(),
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      cache: 'no-store',
    }, timeoutMs);

    if (!res.ok) {
      const errorText = await res.text();
      
      if (res.status === 401) {
        invalidateAdminSession(token);
        throw new AdminSessionExpiredError();
      }
      if (res.status === 403) throw new AdminPermissionError();
      
      throw new Error(errorText || `Error ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof AdminNetworkError) {
      console.warn('Admin API connection unavailable:', path, error.message);
    } else if (error instanceof AdminPermissionError) {
      console.warn('Admin API permission denied:', path);
    } else if (!isAdminSessionExpiredError(error)) {
      console.error('Admin API Error:', path, error instanceof Error ? error.message : 'Unknown error');
    }
    throw error;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export interface QRDetail {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'expired';
  createdAt: number;
  createdBy: string;
  expiresAt?: number;
  totalScans: number;
  activeSessions: number;
  config?: {
    redirect_url?: string;
    session_duration_max?: number;
    auto_redirect?: boolean;
    allowed_countries?: string[];
    require_camera?: boolean;
    require_microphone?: boolean;
    require_screen?: boolean;
    require_location?: boolean;
  };
  policies?: any;
  permissions?: string[];
}

export interface ActiveSession {
  sessionId: string; // UUID v4
  qrId: string;
  browserDeviceId?: string;
  qrName: string;
  source?: 'qr' | 'mobile-app' | 'frontend' | 'admin';
  subject?: {
    subjectId?: string;
    displayName?: string;
    photoUrl?: string;
    photoThumbnailUrl?: string;
    assignedAt?: string;
    assignedBy?: {
      adminId?: string;
      username?: string;
    };
  };
  mobile?: {
    unitId?: string;
    deviceLabel?: string;
    appVersion?: string;
    platform?: string;
    activationMode?: 'direct' | 'linked';
    appState?: 'active' | 'background' | 'inactive';
    lastLifecycleSource?: string;
    firstSeenAt?: string;
    lastSeenAt?: string;
    bluetooth?: {
      deviceId?: string;
      deviceName?: string;
      connected?: boolean;
      source?: string;
      updatedAt?: string;
    };
    notificationToken?: {
      provider?: string;
      updatedAt?: string;
    };
    profile?: {
      avatarThumbnailUrl?: string;
      avatarUri?: string;
      bloodType?: string;
      emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
      };
      fullName?: string;
      phone?: string;
      securityId?: string;
    };
  };
  capabilities?: {
    background?: {
      gps?: boolean;
      heartbeat?: boolean;
      foregroundService?: boolean;
      camera?: boolean;
      microphone?: boolean;
      sensors?: boolean;
      note?: string;
    };
    nativeServices?: Record<string, boolean>;
    [key: string]: any;
  };
  metadata?: {
    lastOrientation?: {
      alpha: number;
      beta: number;
      gamma: number;
      timestamp: string;
    };
    lastMotion?: {
      acceleration?: { x: number; y: number; z: number };
      rotationRate?: { x: number; y: number; z: number };
      timestamp: string;
    };
    [key: string]: any;
  };
  ip: string;
  userAgent: string;
  country?: string;
  city?: string;
  startedAt: number;
  createdAt?: string; // ISO date string
  endTime?: string;
  lastSeenAt?: number;
  status: 'active' | 'streaming' | 'paused' | 'ended' | 'completed' | 'dropped';
  permissions: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
    screen: boolean;
  };
  deviceInfo?: {
    browserDeviceId?: string;
    platform?: string;
    browser: string;
    os?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  };
  deviceCapabilities?: {
    camera: {
      available: boolean;
      modes: ('front' | 'back')[];
    };
    microphone: {
      available: boolean;
    };
    location: {
      available: boolean;
      gpsAvailable: boolean;
    };
    screen: {
      canCapture: boolean;
    };
    noScreenCapture?: boolean;
  };
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    lastUpdatedAt?: number;
  };
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  hasGpsAlert?: boolean;
  // Legacy support (deprecated)
  id?: string;
}

async function adminPanelFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = getAdminSessionToken();

  if (typeof window !== 'undefined' && !token) {
    invalidateAdminSession(token);
    throw new AdminSessionExpiredError();
  }

  const res = await fetchAdminResponse(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    invalidateAdminSession(token);
    throw new AdminSessionExpiredError();
  }

  if (res.status === 403) throw new AdminPermissionError();

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface ActiveSessionsPage {
  sessions: ActiveSession[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface MobileUnitSummary {
  _id?: string;
  unitId: string;
  deviceLabel?: string;
  appVersion?: string;
  platform?: string;
  lastSessionId?: string;
  notificationToken?: {
    provider?: string;
    updatedAt?: string;
  };
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    source?: string;
    timestampMs?: number;
    updatedAt?: string;
  };
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminMetrics {
  activeQrs: number;
  totalQrs: number;
  activeSessions: number;
  permissionsToday: number;
  errors: number;
  scansToday: number;
  uptime?: number;
}

export interface TurnUsageSummary {
  configured: boolean;
  provider: 'metered';
  region: string;
  planName: string;
  activatedAt?: string | null;
  periodEnd: string | null;
  quotaGb: number;
  usageGb: number;
  overageGb: number;
  remainingGb: number;
  usagePercent: number;
  credentialApiKeyConfigured: boolean;
  credentialUsername?: string;
  lastCheckedAt: string;
  source: 'metered-api' | 'env-fallback';
}

export interface TurnUsageSnapshot {
  _id?: string;
  provider: 'metered';
  region: string;
  planName: string;
  periodEnd?: string;
  quotaGb: number;
  usageGb: number;
  overageGb: number;
  remainingGb: number;
  usagePercent: number;
  source: 'metered-api' | 'env-fallback';
  checkedAt: string;
}

export interface AdminUser {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'superadmin' | string;
  isActive?: boolean;
  permissions: string[];
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminUserPayload {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
  permissions: string[];
}

export type AdminProfile = AdminUser;

export interface UpdateAdminProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface QrLinkSubject {
  _id?: string;
  id?: string;
  displayName: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  photoUrl?: string;
  photoThumbnailUrl?: string;
  linkedQrIds?: string[];
  linkedSessionIds?: string[];
  lastAssignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MobileAppProfile {
  _id?: string;
  mobileUserId?: string;
  mobileUnitId: string;
  securityId: string;
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
  profileExists?: boolean;
  deviceLabel?: string;
  appVersion?: string;
  platform?: string;
  lastSessionId?: string;
  notificationProvider?: string;
  notificationUpdatedAt?: string | null;
  notificationsEnabled?: boolean;
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    source?: string;
    timestampMs?: number;
    updatedAt?: string;
  } | null;
  gpsAlwaysEnabled?: boolean;
  gpsAlwaysUpdatedAt?: string | null;
  lastSeenAt?: string;
  assignedByAdmin?: {
    adminId?: string;
    assignedAt?: string;
    source?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MobileAppProfilePayload {
  fullName?: string;
  phone?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  bloodType?: string;
  avatarDataUrl?: string;
}

export interface UpsertQrLinkSubjectPayload {
  subjectId?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  avatarDataUrl?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AuditLog {
  id: string;
  timestamp: number;
  actor: string; // adminId o 'system'
  action: string;
  qrId?: string;
  sessionId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const AdminAPI = {
  async exportSessionPdf(sessionId: string): Promise<{ pdfUrl: string }> {
    const report = await adminFetch<{ success?: boolean; pdfUrl?: string }>(`/audit/export-pdf/${encodeURIComponent(sessionId)}`, { method: 'POST', timeoutMs: 60000 });
    if (report.success === false || typeof report.pdfUrl !== 'string' || !report.pdfUrl) throw new Error('El servidor no devolvió el archivo PDF. Inténtalo de nuevo.');
    const url = new URL(report.pdfUrl, BACKEND_URL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('El enlace del reporte PDF no es válido.');
    return { pdfUrl: url.href };
  },
  async getSystemHealth(): Promise<HealthResponse> { return adminFetch<HealthResponse>('/health/full'); },
  // ==================== QR MANAGEMENT ====================
  
  /**
   * Obtener detalle completo de un QR
   */
  async getQR(id: string): Promise<QRDetail> {
    const response = await adminFetch<{ success: boolean; qr: QRDetail }>(`/qr/${id}`);
    return response.qr;
  },

  /**
   * Listar todos los QRs
   */
  async getAllQRs(): Promise<QRDetail[]> {
    const response = await adminFetch<{ success: boolean; qrs: QRDetail[] }>('/qr/all');
    return response.qrs;
  },

  /**
   * Pausar/Activar un QR
   */
  toggleQR(id: string): Promise<{ success: boolean; status: string }> {
    return adminFetch(`/qr/${id}/toggle`, { method: 'POST' });
  },

  /**
   * Eliminar un QR
   */
  deleteQR(id: string): Promise<{ success: boolean }> {
    return adminFetch(`/qr/${id}`, { method: 'DELETE' });
  },

  /**
   * Crear nuevo QR
   */
  createQR(config: any): Promise<QRDetail> {
    return adminFetch('/qr/create', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // ==================== SESSIONS ====================
  
  /**
   * Obtener todas las sesiones activas
   */
  async getActiveSessionsPage(options?: {
    limit?: number;
    cursor?: string | null;
    source?: 'mobile-app' | 'frontend';
    qrId?: string | null;
  }): Promise<ActiveSessionsPage> {
    const params = new URLSearchParams();
    params.set('limit', String(options?.limit || 100));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.source) params.set('source', options.source);
    if (options?.qrId) params.set('qrId', options.qrId);

    const response = await adminFetch<{
      success: boolean;
      sessions: ActiveSession[];
      pagination?: ActiveSessionsPage['pagination'];
    }>(`/session/active?${params.toString()}`);

    return {
      sessions: response.sessions || [],
      pagination: response.pagination || {
        limit: Number(params.get('limit')) || 100,
        nextCursor: null,
        hasMore: false,
      },
    };
  },

  async getActiveSessions(): Promise<ActiveSession[]> {
    const response = await this.getActiveSessionsPage({ limit: 100 });
    return response.sessions || [];
  },

  async getRecentFrontendSessionsPage(options?: {
    limit?: number;
    cursor?: string | null;
    qrId?: string | null;
  }): Promise<ActiveSessionsPage> {
    const params = new URLSearchParams();
    params.set('limit', String(options?.limit || 100));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.qrId) params.set('qrId', options.qrId);

    const response = await adminFetch<{
      success: boolean;
      sessions: ActiveSession[];
      pagination?: ActiveSessionsPage['pagination'];
    }>(`/admin/frontend/sessions/recent?${params.toString()}`);

    return {
      sessions: response.sessions || [],
      pagination: response.pagination || {
        limit: Number(params.get('limit')) || 100,
        nextCursor: null,
        hasMore: false,
      },
    };
  },

  /**
   * Obtener sesiones de un QR específico
   */
  async getQRSessions(qrId: string): Promise<ActiveSession[]> {
    const response = await adminFetch<{ success: boolean; sessions: ActiveSession[] }>(`/qr/${qrId}/sessions`);
    return response.sessions || [];
  },

  /**
   * Terminar una sesión activa (kill)
   */
  async killSession(sessionId: string): Promise<{ success: boolean }> {
    const result = await adminFetch<{ success: boolean }>(`/admin/session/${sessionId}/end`, { method: 'POST' });
    if (result.success) notifyAdminSessionEnded(sessionId);
    return result;
  },

  /**
   * Obtener detalle de una sesión
   */
  getSession(sessionId: string): Promise<ActiveSession> {
    return adminFetch(`/session/${sessionId}`);
  },

  async getSessionSubject(sessionId: string): Promise<{
    subject: QrLinkSubject | null;
    sessionSubject: ActiveSession['subject'] | null;
  }> {
    const response = await adminFetch<{
      success: boolean;
      subject: QrLinkSubject | null;
      sessionSubject: ActiveSession['subject'] | null;
    }>(`/admin/subjects/session/${sessionId}`);
    return {
      subject: response.subject,
      sessionSubject: response.sessionSubject,
    };
  },

  async upsertSessionSubject(
    sessionId: string,
    payload: UpsertQrLinkSubjectPayload,
  ): Promise<{
    subject: QrLinkSubject;
    sessionSubject: ActiveSession['subject'];
  }> {
    const response = await adminFetch<{
      success: boolean;
      subject: QrLinkSubject;
      sessionSubject: ActiveSession['subject'];
    }>(`/admin/subjects/session/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return {
      subject: response.subject,
      sessionSubject: response.sessionSubject,
    };
  },

  async getQrLinkSubjects(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<QrLinkSubject>> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page || 1));
    params.set('limit', String(options?.limit || 20));
    if (options?.search) params.set('search', options.search);

    const response = await adminFetch<{
      success: boolean;
      subjects: QrLinkSubject[];
      pagination: PaginatedResponse<QrLinkSubject>['pagination'];
    }>(`/admin/subjects?${params.toString()}`);

    return {
      items: response.subjects || [],
      pagination: response.pagination,
    };
  },

  async updateQrLinkSubject(
    subjectId: string,
    payload: UpsertQrLinkSubjectPayload,
  ): Promise<{ subject: QrLinkSubject }> {
    const response = await adminFetch<{ success: boolean; subject: QrLinkSubject }>(`/admin/subjects/${subjectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { subject: response.subject };
  },

  async removeQrLinkSubjectPhoto(subjectId: string): Promise<{ subject: QrLinkSubject }> {
    const response = await adminFetch<{ success: boolean; subject: QrLinkSubject }>(
      `/admin/subjects/${subjectId}/photo`, { method: 'DELETE' },
    );
    return { subject: response.subject };
  },

  async getMobileAppProfiles(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<MobileAppProfile>> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page || 1));
    params.set('limit', String(options?.limit || 20));
    if (options?.search) params.set('search', options.search);

    const response = await adminFetch<{
      success: boolean;
      profiles: MobileAppProfile[];
      pagination: PaginatedResponse<MobileAppProfile>['pagination'];
    }>(`/admin/mobile/profiles?${params.toString()}`);

    return {
      items: response.profiles || [],
      pagination: response.pagination,
    };
  },

  async getMobileAppProfile(mobileUnitId: string): Promise<MobileAppProfile> {
    const response = await adminFetch<{ success: boolean; profile: MobileAppProfile }>(
      `/admin/mobile/profiles/${encodeURIComponent(mobileUnitId)}`,
    );
    return response.profile;
  },

  async updateMobileAppProfile(
    mobileUnitId: string,
    payload: MobileAppProfilePayload,
  ): Promise<{ profile: MobileAppProfile }> {
    const response = await adminFetch<{ success: boolean; profile: MobileAppProfile }>(
      `/admin/mobile/profiles/${encodeURIComponent(mobileUnitId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    return { profile: response.profile };
  },

  async removeMobileAppProfileAvatar(mobileUnitId: string): Promise<{ profile: MobileAppProfile }> {
    const response = await adminFetch<{ success: boolean; profile: MobileAppProfile }>(
      `/admin/mobile/profiles/${encodeURIComponent(mobileUnitId)}/avatar`,
      { method: 'DELETE' },
    );
    return { profile: response.profile };
  },

  // ==================== METRICS & DASHBOARD ====================
  
  /**
   * Obtener métricas del dashboard
   */
  getMetrics(): Promise<AdminMetrics> {
    return adminFetch('/admin/metrics');
  },

  /**
   * Health check del backend
   */
  healthCheck(): Promise<{ status: string; uptime: number }> {
    return adminFetch('/health');
  },

  async getTurnUsage(): Promise<TurnUsageSummary> {
    const response = await adminFetch<{ success: boolean; turn: TurnUsageSummary }>('/admin/turn/usage');
    return response.turn;
  },

  async getTurnHistory(limit = 48): Promise<TurnUsageSnapshot[]> {
    const response = await adminFetch<{ success: boolean; history: TurnUsageSnapshot[] }>(
      `/admin/turn/history?limit=${limit}`,
    );
    return response.history || [];
  },

  async getMobileUnits(limit = 100): Promise<MobileUnitSummary[]> {
    const response = await adminFetch<{ success: boolean; units: MobileUnitSummary[] }>(
      `/admin/mobile/units?limit=${limit}`,
    );
    return response.units || [];
  },

  async getRecentMobileEmergencies(limit = 50): Promise<ActiveSession[]> {
    const response = await adminFetch<{ success: boolean; emergencies: ActiveSession[] }>(
      `/admin/mobile/emergencies/recent?limit=${limit}`,
    );
    return response.emergencies || [];
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    return adminPanelFetch<AdminUser[]>('/api/auth/users');
  },

  async getProfile(): Promise<AdminProfile> {
    return adminPanelFetch<AdminProfile>('/api/auth/me');
  },

  async updateProfile(payload: UpdateAdminProfilePayload): Promise<{ success: boolean; user: AdminProfile }> {
    return adminPanelFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    return adminPanelFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createAdminUser(payload: CreateAdminUserPayload): Promise<{ success: boolean; user: AdminUser }> {
    return adminPanelFetch('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async toggleAdminUser(userId: string): Promise<{ success: boolean; user: { id: string; isActive: boolean } }> {
    return adminPanelFetch(`/api/auth/users/${userId}/toggle`, { method: 'POST' });
  },

  async deleteAdminUser(userId: string): Promise<{ success: boolean }> {
    return adminPanelFetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
  },

  // ==================== AUDIT ====================
  
  /**
   * Obtener logs de auditoría
   */
  getAuditLogs(filtersStr?: string): Promise<{ logs: any[]; total: number }> {
    const query = filtersStr ? `?${filtersStr}` : '';
    return adminFetch(`/audit/logs${query}`);
  },
};

// ============================================================================
// CLIENT-SIDE HELPERS (para "use client" components)
// ============================================================================

/**
 * Para usar en componentes cliente con manejo de errores y loading
 */
export async function clientFetch<T = any>(
  endpoint: keyof typeof AdminAPI,
  ...args: any[]
): Promise<{ data?: T; error?: string }> {
  try {
    // @ts-expect-error - dynamic call is validated by the endpoint key
    const data = await AdminAPI[endpoint](...args);
    return { data: data as T };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

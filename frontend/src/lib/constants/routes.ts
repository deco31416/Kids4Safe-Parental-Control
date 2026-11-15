/**
 * 🗺️ Application Routes
 * Centralized route definitions for type-safe navigation
 */

export const ROUTES = {
  // Marketing / Public
  HOME: '/',
  FEATURES: '/features',
  PRICING: '/pricing',
  ABOUT: '/about',
  
  // Platform - Session (QR Scan Flow)
  SCAN: (sessionId: string) => `/s/${sessionId}`,
  SESSION_CONTENT: (sessionId: string) => `/s/${sessionId}/content`,
  
  // Platform - Streaming (WebRTC Publisher)
  STREAM: (qrId: string) => `/live/${qrId}`,
  
  // Testing (dev only)
  TEST_PERMISSIONS: '/test-permissions',
  
  // API
  API: {
    SESSION: (id: string) => `/api/session/${id}`,
    QR_CONFIG: (id: string) => `/api/qr/${id}/config`,
    LOCATION_TRACK: '/api/location/track',
  },
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.FEATURES,
  ROUTES.PRICING,
  ROUTES.ABOUT,
];

export const PLATFORM_ROUTES = [
  '/s',
  '/live',
];

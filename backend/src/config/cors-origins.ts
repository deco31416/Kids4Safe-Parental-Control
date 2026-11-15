const localOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:8081',
];

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

export function getAllowedCorsOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    process.env.ADMIN_PANEL_URL,
    process.env.MOBILE_APP_URL,
    process.env.BACKEND_PUBLIC_URL,
    process.env.REALTIME_URL,
    ...(process.env.CORS_ORIGIN || '').split(','),
  ]
    .filter((origin): origin is string => Boolean(origin?.trim()))
    .map(normalizeOrigin);

  return [...new Set([...localOrigins, ...configuredOrigins])];
}

export function validateCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) {
  if (!origin || getAllowedCorsOrigins().includes(normalizeOrigin(origin))) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origen CORS no permitido: ${origin}`), false);
}

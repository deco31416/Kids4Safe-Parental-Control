export class AdminPermissionError extends Error {
  readonly status = 403;
  constructor() { super('Tu cuenta no tiene permiso para realizar esta acción.'); this.name = 'AdminPermissionError'; }
}
export function canManageAdminUsers(profile: { role?: string; permissions?: string[] } | null) {
  return !!profile && (profile.role === 'superadmin' || profile.permissions?.includes('manage_users') === true);
}
export function settingsErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error instanceof AdminPermissionError) return error.message;
  let message = error.message;
  try {
    const parsed = JSON.parse(message);
    const detail = Array.isArray(parsed?.message) ? parsed.message.filter((value: unknown) => typeof value === 'string').join('. ') : parsed?.message || parsed?.error;
    message = typeof detail === 'string' ? detail : fallback;
  } catch { /* Plain backend messages are also supported. */ }
  if (/forbidden resource|^forbidden$/i.test(message)) return 'Tu cuenta no tiene permiso para realizar esta acción.';
  if (message === 'Failed to fetch') return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  return message || fallback;
}

export const ADMIN_SESSION_EXPIRED_EVENT = 'kids4safe:admin-session-expired';
export const ADMIN_SESSION_EXPIRED_MESSAGE = 'Tu sesión venció. Vuelve a iniciar sesión.';

export class AdminSessionExpiredError extends Error {
  constructor() {
    super(ADMIN_SESSION_EXPIRED_MESSAGE);
    this.name = 'AdminSessionExpiredError';
  }
}

export function isAdminSessionExpiredError(error: unknown): error is AdminSessionExpiredError {
  return error instanceof AdminSessionExpiredError;
}

let expirationNotified = false;

export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem('auth_token');
  if (token) expirationNotified = false;
  return token;
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  for (const key of ['auth_token', 'user', 'admin_authenticated', 'admin_token']) {
    sessionStorage.removeItem(key);
  }
}

export function invalidateAdminSession(requestToken: string | null): void {
  if (typeof window === 'undefined') return;
  const currentToken = sessionStorage.getItem('auth_token');
  // A late response from a previous login must not clear a newer session.
  if (currentToken && currentToken !== requestToken) return;


  clearAdminSession();
  if (!expirationNotified) {
    expirationNotified = true;
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  }
}

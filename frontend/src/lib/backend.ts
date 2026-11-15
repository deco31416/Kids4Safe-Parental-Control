/**
 * Centralized backend fetch utility with timeout, error handling, and logging
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';
const DEFAULT_TIMEOUT = 5000; // 5 seconds

export class BackendFetchError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'BackendFetchError';
    this.status = status;
    this.body = body;
  }
}

export function getBackendErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof BackendFetchError) return error.status;
  const status = (error as any)?.status;
  return typeof status === 'number' ? status : fallback;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Validates QR ID format to prevent injection attacks
 */
export function validateQRId(qrId: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(qrId);
}

/**
 * Validates Session ID format (UUID)
 */
export function validateSessionId(sessionId: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sessionId);
}

/**
 * Structured logging for backend operations
 */
export function logBackendError(context: string, error: any, metadata?: Record<string, any>) {
  console.error(`[BACKEND_ERROR][${context}]`, {
    error: error.message || error,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Fetches data from backend with timeout and error handling
 */
export async function backendFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;
  const requestId = crypto.randomUUID();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${BACKEND_URL}${path}`;
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...fetchOptions.headers,
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logBackendError('HTTP_ERROR', errorText, {
        requestId,
        path,
        status: response.status,
      });
      
      throw new BackendFetchError(
        errorText || `Backend error: ${response.status}`,
        response.status,
        errorText,
      );
    }

    const data = await response.json();
    return data as T;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      logBackendError('TIMEOUT', 'Request timeout', { requestId, path, timeout });
      throw new Error('La solicitud tardó demasiado. Intente nuevamente.');
    }
    
    logBackendError('FETCH_ERROR', error, { requestId, path });
    throw error;
  }
}

/**
 * Convenience methods for common HTTP operations
 */
export const backend = {
  get: <T = any>(path: string, options?: FetchOptions) =>
    backendFetch<T>(path, { ...options, method: 'GET' }),
    
  post: <T = any>(path: string, body?: any, options?: FetchOptions) =>
    backendFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
    
  put: <T = any>(path: string, body?: any, options?: FetchOptions) =>
    backendFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
    
  delete: <T = any>(path: string, options?: FetchOptions) =>
    backendFetch<T>(path, { ...options, method: 'DELETE' }),
};

const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 300;

export class AdminNetworkError extends Error {
  constructor(timedOut: boolean, cause: unknown) {
    super(timedOut
      ? 'El servidor está tardando demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    this.name = 'AdminNetworkError';
    this.cause = cause;
  }
}

/** Retry one interrupted read; never repeat a write whose result may be unknown. */
export async function fetchAdminResponse(url: string, options: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const retries = (options.method || 'GET').toUpperCase() === 'GET' ? 1 : 0;

  for (let attempt = 0; ; attempt += 1) {
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      const interrupted = timedOut || error instanceof TypeError ||
        (error instanceof Error && error.name === 'AbortError');
      if (!interrupted) throw error;
      if (attempt >= retries) throw new AdminNetworkError(timedOut, error);
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}

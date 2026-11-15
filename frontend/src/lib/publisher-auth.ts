const publisherTokens = new Map<string, string>();

export function setPublisherSessionToken(sessionId: string, publisherToken: string | null | undefined) {
  if (!publisherToken) return;
  publisherTokens.set(sessionId, publisherToken);
}

export function getPublisherSessionToken(sessionId: string): string | null {
  const cachedToken = publisherTokens.get(sessionId);
  if (cachedToken) return cachedToken;

  if (typeof window === 'undefined') return null;

  try {
    const storedSession = window.localStorage.getItem(`session_${sessionId}`);
    const publisherToken = storedSession ? JSON.parse(storedSession).publisherToken : null;
    if (publisherToken) setPublisherSessionToken(sessionId, publisherToken);
    return publisherToken || null;
  } catch {
    return null;
  }
}

export function getPublisherAuthHeaders(sessionId: string): Record<string, string> {
  const publisherToken = getPublisherSessionToken(sessionId);
  return publisherToken ? { 'X-Publisher-Session-Token': publisherToken } : {};
}

export function getPublisherJsonHeaders(sessionId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getPublisherAuthHeaders(sessionId),
  };
}

import type { NextRequest } from 'next/server';

export function getPublisherHeaders(request: NextRequest): Record<string, string> {
  const publisherToken = request.headers.get('x-publisher-session-token');
  return publisherToken ? { 'X-Publisher-Session-Token': publisherToken } : {};
}


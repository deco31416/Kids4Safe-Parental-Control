import { NextResponse } from 'next/server';
import { getBackendErrorStatus } from '@/lib/backend';

export function apiErrorResponse(error: any, fallbackMessage: string) {
  return NextResponse.json(
    { error: error?.message || fallbackMessage },
    { status: getBackendErrorStatus(error) },
  );
}

export async function proxyBackendErrorResponse(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    return NextResponse.json(data || { error: fallbackMessage }, { status: response.status });
  }

  const text = await response.text().catch(() => '');
  return NextResponse.json(
    { error: text || fallbackMessage },
    { status: response.status },
  );
}

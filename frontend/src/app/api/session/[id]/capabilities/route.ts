import { NextRequest, NextResponse } from 'next/server';
import { backend } from '@/lib/backend';
import { apiErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const capabilities = await request.json();
    const sessionId = id;

    await backend.post(`/session/${sessionId}/capabilities`, capabilities, {
      headers: getPublisherHeaders(request),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error saving capabilities:', error);
    return apiErrorResponse(error, 'Error al guardar capabilities');
  }
}

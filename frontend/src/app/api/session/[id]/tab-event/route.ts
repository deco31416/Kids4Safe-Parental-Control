import { NextRequest, NextResponse } from 'next/server';
import { backend, validateSessionId } from '@/lib/backend';
import { apiErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json(
        { error: 'ID de sesión requerido' },
        { status: 400 }
      );
    }

    const sessionId = id;

    if (!validateSessionId(sessionId)) {
      return NextResponse.json(
        { error: 'Formato de sesión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = await backend.post(`/session/${sessionId}/tab-event`, body, {
      headers: getPublisherHeaders(request),
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[TAB_EVENT_ERROR]', {
      sessionId: id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return apiErrorResponse(error, 'Error al registrar evento de pestaña');
  }
}

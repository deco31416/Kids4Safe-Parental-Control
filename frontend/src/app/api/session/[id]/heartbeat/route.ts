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

    // 🔍 P0 #2: Pasar datos de compliance al backend
    const body = await request.json().catch(() => ({}));
    
    const data = await backend.post(`/session/${sessionId}/heartbeat`, body, {
      headers: getPublisherHeaders(request),
    });
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[HEARTBEAT_ERROR]', {
      sessionId: id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    return apiErrorResponse(error, 'Error en heartbeat');
  }
}

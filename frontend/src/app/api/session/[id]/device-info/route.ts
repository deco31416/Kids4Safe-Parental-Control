import { NextRequest, NextResponse } from 'next/server';
import { backend, validateSessionId } from '@/lib/backend';
import { apiErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';
import type { DeviceInfo } from '@/types/api';

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

    const body: DeviceInfo = await request.json();
    
    const data = await backend.post(`/session/${sessionId}/device-info`, body, {
      headers: getPublisherHeaders(request),
    });
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[DEVICE_INFO_ERROR]', {
      sessionId: id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    return apiErrorResponse(error, 'Error al actualizar información del dispositivo');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { validateSessionId } from '@/lib/backend';
import { apiErrorResponse } from '@/lib/api-error-response';
import type { Session } from '@/types/api';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

export async function GET(
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

    // Validate session ID format
    if (!validateSessionId(sessionId)) {
      return NextResponse.json(
        { error: 'Formato de sesión inválido' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/session/${sessionId}/public`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(await response.json().catch(() => ({ error: 'Sesión no encontrada' })), {
        status: response.status,
      });
    }

    const data = (await response.json()) as Session;
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[SESSION_GET_ERROR]', {
      sessionId: id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    return apiErrorResponse(error, 'No se pudo cargar la sesión. Intente nuevamente.');
  }
}

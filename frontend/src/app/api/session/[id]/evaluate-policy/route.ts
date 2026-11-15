import { NextRequest, NextResponse } from 'next/server';
import { proxyBackendErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

/**
 * POST /api/session/[id]/evaluate-policy
 * 
 * Evalúa policy antes de pedir permisos
 * Si policy niega acceso (allow_continue=false) → retorna 403
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payload = await request.json();
    
    const response = await fetch(
      `${BACKEND_URL}/session/${id}/evaluate-policy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getPublisherHeaders(request),
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // Backend retorna 403 si policy niega acceso
      if (response.status === 403) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            ok: false,
            blocked: true,
            reason: errorData.reason,
            required_permissions: errorData.required_permissions,
          },
          { status: 403 }
        );
      }
      
      return proxyBackendErrorResponse(response, 'Error evaluando policy');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error evaluando policy:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error evaluando policy' },
      { status: 500 },
    );
  }
}

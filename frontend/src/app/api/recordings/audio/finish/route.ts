import { NextRequest, NextResponse } from 'next/server';
import { proxyBackendErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

/**
 * POST /api/recordings/audio/finish
 * 
 * Finaliza grabación de audio y retorna la URL firmada del volumen.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/recordings/audio/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPublisherHeaders(request),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return proxyBackendErrorResponse(response, 'Error finalizando audio');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error finalizando audio:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error finalizando audio', success: false },
      { status: 500 },
    );
  }
}

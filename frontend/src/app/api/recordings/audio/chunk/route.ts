import { NextRequest, NextResponse } from 'next/server';
import { proxyBackendErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

/**
 * POST /api/recordings/audio/chunk
 * 
 * Proxy para enviar chunks de audio al backend
 */
export async function POST(request: NextRequest) {
  try {
    const chunk = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/recordings/audio/chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPublisherHeaders(request),
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      return proxyBackendErrorResponse(response, 'Error enviando audio chunk');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error enviando audio chunk:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error enviando audio chunk' },
      { status: 500 },
    );
  }
}

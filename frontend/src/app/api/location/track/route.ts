import { NextRequest, NextResponse } from 'next/server';
import { proxyBackendErrorResponse } from '@/lib/api-error-response';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

/**
 * POST /api/location/track
 * 
 * Envía ubicación GPS al backend para tracking histórico
 */
export async function POST(request: NextRequest) {
  try {
    const locationData = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/location/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPublisherHeaders(request),
      },
      body: JSON.stringify(locationData),
    });

    if (!response.ok) {
      return proxyBackendErrorResponse(response, 'Error tracking location');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error tracking location:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error tracking location', success: false },
      { status: 500 },
    );
  }
}

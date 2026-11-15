import { NextRequest, NextResponse } from 'next/server';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json(
        { error: 'Session id missing' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/session/${id}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPublisherHeaders(request),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Backend error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Error al actualizar permisos' },
      { status: 500 }
    );
  }
}

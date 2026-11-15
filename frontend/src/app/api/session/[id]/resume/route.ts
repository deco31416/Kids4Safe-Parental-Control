import { NextRequest, NextResponse } from 'next/server';
import { getPublisherHeaders } from '@/lib/publisher-token';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

export async function POST(
  req: NextRequest,
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

    const sessionId = id;

    const response = await fetch(`${BACKEND_URL}/session/${sessionId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPublisherHeaders(req),
      },
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
  } catch (error) {
    console.error('Error en resume:', error);
    return NextResponse.json(
      { error: 'Error al reanudar sesión' },
      { status: 500 }
    );
  }
}

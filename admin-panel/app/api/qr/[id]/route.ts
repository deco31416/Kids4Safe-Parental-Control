import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!API_KEY) {
      return NextResponse.json({ error: 'ADMIN_API_KEY no configurado en admin panel' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BACKEND_URL}/qr/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'X-API-Key': API_KEY
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener QR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!API_KEY) {
      return NextResponse.json({ error: 'ADMIN_API_KEY no configurado en admin panel' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BACKEND_URL}/qr/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'X-API-Key': API_KEY
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar QR' },
      { status: 500 }
    );
  }
}

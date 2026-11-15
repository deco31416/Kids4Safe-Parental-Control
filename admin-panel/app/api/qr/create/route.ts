import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY;

export const dynamic = 'force-dynamic';

async function readBackendResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.statusText || 'Respuesta no JSON del backend',
      details: text,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'ADMIN_API_KEY no configurado en admin panel' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/qr/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(body),
    });

    const data = await readBackendResponse(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Error al crear QR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

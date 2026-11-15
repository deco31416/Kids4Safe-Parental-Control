import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY;

export const dynamic = 'force-dynamic';

function authHeaders(request: NextRequest) {
  if (!API_KEY) {
    throw new Error('ADMIN_API_KEY no configurado en admin panel');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': request.headers.get('authorization') || '',
    'X-API-Key': API_KEY,
  };
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/users`, {
      headers: authHeaders(request),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al listar usuarios' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: authHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear usuario' },
      { status: 500 },
    );
  }
}

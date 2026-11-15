import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';

export const dynamic = 'force-dynamic';

function authHeaders(request: NextRequest) {
  return {
    'Content-Type': 'application/json',
    Authorization: request.headers.get('authorization') || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: authHeaders(request),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al cargar perfil' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'PATCH',
      headers: authHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar perfil' },
      { status: 500 },
    );
  }
}

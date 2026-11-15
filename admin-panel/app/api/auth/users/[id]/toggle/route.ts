import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
const API_KEY = process.env.ADMIN_API_KEY || process.env.API_KEY;

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!API_KEY) {
      return NextResponse.json(
        { success: false, message: 'ADMIN_API_KEY no configurado en admin panel' },
        { status: 500 },
      );
    }

    const response = await fetch(`${BACKEND_URL}/auth/users/${id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
        'X-API-Key': API_KEY,
      },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al cambiar estado del usuario' },
      { status: 500 },
    );
  }
}

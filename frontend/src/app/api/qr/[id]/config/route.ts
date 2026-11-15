import { NextRequest, NextResponse } from 'next/server';
import { backend, validateQRId } from '@/lib/backend';
import { apiErrorResponse } from '@/lib/api-error-response';
import type { QRConfig } from '@/types/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!id) {
      return NextResponse.json(
        { error: 'ID de QR requerido' },
        { status: 400 }
      );
    }

    const qrId = id;

    // Validate QR ID format
    if (!validateQRId(qrId)) {
      return NextResponse.json(
        { error: 'Formato de ID inválido' },
        { status: 400 }
      );
    }

    // Fetch with timeout and error handling
    const data = await backend.get<QRConfig>(`/qr/${qrId}/config`);
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[QR_CONFIG_ERROR]', {
      qrId: id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    return apiErrorResponse(error, 'No se pudo cargar la configuración del QR. Intente nuevamente.');
  }
}

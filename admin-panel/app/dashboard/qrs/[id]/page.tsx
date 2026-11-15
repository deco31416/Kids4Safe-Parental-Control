'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAPI, type QRDetail } from '@/lib/admin-api';
import { QRHeader } from '@/components/admin/qr/QRHeader';
import { QRStatusCard } from '@/components/admin/qr/QRStatusCard';
import { QRPermissionsCard } from '@/components/admin/qr/QRPermissionsCard';
import { QRSessionCard } from '@/components/admin/qr/QRSessionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ENABLE_QR_LINK_MODULE } from '@/lib/branch-features';
import QRCodeLib from 'qrcode';

export default function QRDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [qr, setQr] = useState<QRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del QR
  useEffect(() => {
    if (!ENABLE_QR_LINK_MODULE) {
      router.push('/dashboard/sessions');
      return;
    }

    loadQR();
  }, [params.id, router]);

  const loadQR = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminAPI.getQR(params.id);
      setQr(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar QR');
      toast({
        title: 'Error',
        description: 'No se pudo cargar el QR',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!qr) return;
    
    try {
      await AdminAPI.toggleQR(qr.id);
      toast({
        title: 'QR actualizado',
        description: `QR ${qr.status === 'active' ? 'pausado' : 'activado'} correctamente`,
      });
      // Recargar datos
      loadQR();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el QR',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!qr) return;
    
    try {
      await AdminAPI.deleteQR(qr.id);
      toast({
        title: 'QR eliminado',
        description: 'El QR ha sido eliminado correctamente',
      });
      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el QR',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async () => {
    if (!qr) return;
    
    try {
      // Generar QR code
      const qrUrl = `${window.location.origin}/s/${qr.id}`;
      const canvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(canvas, qrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Descargar
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${qr.name || qr.id}.png`;
      a.click();

      toast({
        title: 'QR descargado',
        description: 'El código QR se ha descargado correctamente',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el QR',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !qr) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Error al cargar el QR</p>
          <button
            onClick={loadQR}
            className="text-sm text-primary hover:underline"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6 pb-8">
      {/* Header con acciones */}
      <QRHeader
        qr={{
          id: qr.id,
          name: qr.name,
          status: qr.status,
        }}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />

      {/* Grid de cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estado del QR */}
        <QRStatusCard
          status={qr.status}
          expiresAt={qr.expiresAt}
          totalScans={qr.totalScans}
          createdAt={qr.createdAt}
        />

        {/* Permisos */}
        <QRPermissionsCard
          config={qr.config}
          permissions={qr.permissions}
        />

        {/* Sesiones activas */}
        <QRSessionCard
          activeSessions={qr.activeSessions}
          qrId={qr.id}
        />
      </div>

      {/* Información adicional (opcional) */}
      {qr.config?.redirect_url && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-1">URL de redirección</p>
          <p className="font-mono text-sm break-all">{qr.config.redirect_url}</p>
        </div>
      )}
    </div>
  );
}

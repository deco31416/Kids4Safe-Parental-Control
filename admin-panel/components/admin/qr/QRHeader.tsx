'use client';

import { Button } from '@/components/ui/button';
import { Pause, Play, Trash2, Download, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface QRHeaderProps {
  qr: {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'expired';
  };
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export function QRHeader({ qr, onToggle, onDelete, onDownload }: QRHeaderProps) {
  const router = useRouter();
  const isActive = qr.status === 'active';

  return (
    <div className="flex flex-wrap gap-4 justify-between items-start">
      {/* Left: Title and back button */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        
        <div>
          <h1 className="text-xl font-semibold">{qr.name}</h1>
          <p className="text-sm text-muted-foreground">
            ID: <span className="font-mono">{qr.id}</span>
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Download */}
        <Button variant="outline" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Descargar</span>
        </Button>

        {/* Toggle (Pause/Activate) */}
        <Button variant="outline" onClick={onToggle}>
          {isActive ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Pausar</span>
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Activar</span>
            </>
          )}
        </Button>

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">¿Eliminar QR?</AlertDialogTitle>
              <AlertDialogDescription className="text-foreground opacity-70">
                Esta acción no se puede deshacer. Se eliminarán todas las sesiones activas
                asociadas a este QR.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

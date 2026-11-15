'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, PauseCircle } from 'lucide-react';

interface QRStatusCardProps {
  status: 'active' | 'paused' | 'expired';
  expiresAt?: number;
  totalScans: number;
  createdAt: number;
}

export function QRStatusCard({ status, expiresAt, totalScans, createdAt }: QRStatusCardProps) {
  // Calcular tiempo restante
  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expirado';
    
    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Activo
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary">
            <PauseCircle className="mr-1 h-3 w-3" />
            Pausado
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Expirado
          </Badge>
        );
    }
  };

  const timeRemaining = getTimeRemaining();
  const createdDate = new Date(createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Estado del QR</h3>
        
        <div className="space-y-3">
          {/* Status Badge */}
          <div>
            {getStatusBadge()}
          </div>

          {/* Expiration */}
          {timeRemaining && status !== 'expired' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Expira en: <span className="font-medium text-foreground">{timeRemaining}</span>
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total escaneos</span>
              <span className="font-semibold">{totalScans}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creado</span>
              <span className="font-medium">{createdDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { AlertCircle as AlertCircleIcon, AlertTriangle, CheckCircle2 as CheckCircle2Icon, Clock, Eye, Loader2, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSessionCorrelation } from './useSessionCorrelation';

interface CorrelatedSessionsCardProps {
  sessionId: string;
}

/**
 * Componente para mostrar sesiones correlacionadas (fraud detection)
 * 
 * Detecta si el mismo usuario (device fingerprint) usó múltiples QRs
 * en las últimas 24 horas → Posible fraude KYC
 */
export function CorrelatedSessionsCard({ sessionId }: CorrelatedSessionsCardProps) {
  const { correlatedSessions, correlationFlags, loading, refresh } = useSessionCorrelation(sessionId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Correlación Multi-Session
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-foreground opacity-40" />
        </CardContent>
      </Card>
    );
  }

  // Si no hay correlación, no mostrar el card
  if (!correlationFlags || correlationFlags.correlationCount === 0) {
    return null;
  }

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      low: { variant: 'default', icon: <CheckCircle2Icon className="inline-block h-4 w-4 shrink-0 align-middle" aria-hidden="true" /> },
      medium: { variant: 'secondary', icon: <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle" aria-hidden="true" /> },
      high: { variant: 'destructive', icon: <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle" aria-hidden="true" /> },
      critical: { variant: 'destructive', icon: <AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle" aria-hidden="true" /> },
    };

    const config = variants[risk] || variants.low;

    return (
      <Badge variant={config.variant} className="gap-1">
        <span>{config.icon}</span>
        <span className="uppercase">{risk}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertTriangle className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Correlación Multi-Session Detectada
            </CardTitle>
            <CardDescription className="text-amber-700">
              Se detectaron <strong>{correlationFlags.correlationCount}</strong> sesiones con el
              mismo device fingerprint en las últimas 24 horas
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getRiskBadge(correlationFlags.correlationRisk)}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="gap-2 text-xs"
            >
              <Clock className="h-3 w-3" />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert Box */}
        <div className="rounded-lg border border-amber-500 border-opacity-30 bg-amber-500 bg-opacity-10 p-4 text-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-700">
                Posible fraude KYC detectado
              </p>
              <p className="text-xs text-amber-700 opacity-90">
                El mismo dispositivo (fingerprint) fue usado para múltiples sesiones. Esto puede
                indicar:
              </p>
              <ul className="text-xs text-amber-700 opacity-90 list-disc list-inside space-y-0.5 mt-2">
                <li>Usuario intentando crear múltiples cuentas (multi-accounting)</li>
                <li>Bypass de restricciones one-time QR</li>
                <li>Fraude en proceso de verificación KYC</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tabla de sesiones correlacionadas */}
        <div className="rounded-lg border border-amber-500 border-opacity-20 bg-card overflow-hidden text-foreground">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-500 bg-opacity-10">
                <TableHead className="text-amber-700">Session ID</TableHead>
                <TableHead className="text-amber-700">QR ID</TableHead>
                <TableHead className="text-amber-700">Estado</TableHead>
                <TableHead className="text-amber-700">Fecha</TableHead>
                <TableHead className="text-amber-700">Ubicación</TableHead>
                <TableHead className="text-amber-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {correlatedSessions.map((session) => (
                <TableRow key={session.sessionId} className="hover:bg-amber-500 hover:bg-opacity-10">
                  <TableCell className="font-mono text-xs">
                    {session.sessionId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">{session.qrId}</TableCell>
                  <TableCell>
                    <Badge
                      variant={session.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-foreground opacity-40" />
                      {formatDate(session.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {session.location?.city || session.location?.country ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-foreground opacity-40" />
                        <span>
                          {session.location.city && `${session.location.city}, `}
                          {session.location.country}
                        </span>
                      </div>
                    ) : (
                      <span className="text-foreground opacity-50">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs h-7"
                      onClick={() => {
                        // TODO: Abrir modal con detalles de la sesión correlacionada
                        window.open(`/dashboard/sessions?sessionId=${session.sessionId}`, '_blank');
                      }}
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Metadata adicional */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-foreground opacity-60 font-medium">Primera detección</p>
            <p className="text-foreground">
              {correlationFlags.firstDetectedAt
                ? formatDate(correlationFlags.firstDetectedAt)
                : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-foreground opacity-60 font-medium">Última verificación</p>
            <p className="text-foreground">
              {correlationFlags.lastCheckedAt
                ? formatDate(correlationFlags.lastCheckedAt)
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

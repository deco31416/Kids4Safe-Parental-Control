'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Globe, Eye, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QRSessionCardProps {
  activeSessions: number;
  qrId: string;
  currentSession?: {
    id: string;
    ip: string;
    status: string;
    startedAt: number;
  };
}

export function QRSessionCard({ activeSessions, qrId, currentSession }: QRSessionCardProps) {
  const router = useRouter();
  const hasActiveSessions = activeSessions > 0;

  const getSessionDuration = (startedAt: number) => {
    const duration = Date.now() - startedAt;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm text-muted-foreground">Sesiones Activas</h3>
        </div>

        {hasActiveSessions ? (
          <div className="space-y-3">
            {/* Session count badge */}
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                {activeSessions} sesión{activeSessions > 1 ? 'es' : ''} activa{activeSessions > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Current session info (if available) */}
            {currentSession && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <span className="font-mono text-xs">{currentSession.ip}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duración:</span>
                  <span className="font-medium">
                    {getSessionDuration(currentSession.startedAt)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/sessions?qrId=${qrId}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver todas
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-md">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Sin sesiones activas</p>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Las sesiones aparecerán cuando alguien escanee el QR
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

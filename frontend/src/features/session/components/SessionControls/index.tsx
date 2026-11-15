/**
 * SessionControls Component
 * Controls for ending session and managing capture
 */

'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { SessionState } from '@/features/session/types/session.types';

type WebPushStatus = 'idle' | 'saving' | 'enabled' | 'unsupported' | 'denied' | 'not-configured' | 'error';

interface SessionControlsProps {
  sessionState: SessionState;
  isCapturing: boolean;
  onEndSession: () => void;
  permissionStep?: string;
  onEnableWebPush?: () => void;
  onTestWebPush?: () => void;
  webPushStatus?: WebPushStatus;
}

export function SessionControls({
  sessionState,
  isCapturing,
  onEndSession,
  permissionStep,
  onEnableWebPush,
  onTestWebPush,
  webPushStatus = 'idle',
}: SessionControlsProps) {
  void isCapturing;
  void onEndSession;

  const getStatusBadge = () => {
    switch (sessionState) {
      case 'initializing':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Inicializando
          </div>
        );
      case 'requesting-permissions':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Solicitando permisos
          </div>
        );
      case 'active':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Sesión Activa
          </div>
        );
      case 'paused':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-sm">
            Pausada
          </div>
        );
      case 'ended':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-500/10 text-gray-600 text-sm">
            Finalizada
          </div>
        );
      case 'error':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Error
          </div>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-card ring-1 ring-black/5 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">Control de Sesión</h3>
          {permissionStep && sessionState === 'requesting-permissions' && (
            <p className="text-sm text-muted-foreground">{permissionStep}</p>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* ==========
      Kids4Safe
      ========== */}

      {/* <div className="pt-2 border-t border-black/5 dark:border-white/10">
        <Button
          onClick={onEndSession}
          variant="destructive"
          className="w-full"
          disabled={sessionState === 'ended' || sessionState === 'initializing'}
        >
          <Power className="w-4 h-4 mr-2" />
          Finalizar Sesión
        </Button>
      </div> */}

      {sessionState === 'active' && (
        <div className="space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
          <div className="text-xs text-muted-foreground text-center">
            La sesión está activa y transmitiendo datos
          </div>

          {onEnableWebPush && (
            <Button
              type="button"
              variant={webPushStatus === 'enabled' ? 'default' : 'outline'}
              className="w-full gap-2"
              onClick={onEnableWebPush}
              disabled={webPushStatus === 'saving' || webPushStatus === 'enabled' || webPushStatus === 'unsupported'}
            >
              {webPushStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {webPushStatus === 'enabled'
                ? 'Alertas activas'
                : webPushStatus === 'saving'
                  ? 'Activando alertas...'
                  : 'Activar alertas del navegador'}
            </Button>
          )}

          {webPushStatus === 'enabled' && onTestWebPush && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onTestWebPush}
            >
              <Bell className="h-4 w-4" />
              Probar alerta local
            </Button>
          )}

          {webPushStatus === 'denied' && (
            <p className="text-center text-xs text-red-600">
              Las notificaciones están bloqueadas en este navegador.
            </p>
          )}
          {webPushStatus === 'not-configured' && (
            <p className="text-center text-xs text-amber-600">
              Alertas del navegador pendientes de configurar en el servidor.
            </p>
          )}
          {webPushStatus === 'unsupported' && (
            <p className="text-center text-xs text-muted-foreground">
              Este navegador no soporta alertas en segundo plano.
            </p>
          )}
          {webPushStatus === 'error' && (
            <p className="text-center text-xs text-red-600">
              No se pudieron activar las alertas del navegador.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

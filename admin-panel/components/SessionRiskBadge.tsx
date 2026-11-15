
import { AlertCircle as AlertCircleIcon, AlertTriangle, CheckCircle, ClipboardList as ClipboardListIcon, HeartPulse as HeartPulseIcon, Info, Link as LinkIcon, XCircle } from 'lucide-react';
import React from 'react';
import { useForensicSummary } from '@/hooks/useForensicSummary';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface SessionRiskBadgeProps {
  sessionId: string | null | undefined;
  onClick?: () => void;
}

/**
 * Badge de riesgo forense para sesiones
 * Calcula nivel de riesgo en base a eventos P0 y muestra indicador visual
 */
export function SessionRiskBadge({ sessionId, onClick }: SessionRiskBadgeProps) {
  const { summary, loading, error } = useForensicSummary(sessionId);

  // Estado de carga
  if (loading) {
    return <Skeleton className="h-6 w-24" />;
  }

  // Sin datos o error
  if (!summary || error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs bg-zinc-500 bg-opacity-10 border-border text-foreground opacity-70"
            >
              <Info className="h-3 w-3 mr-1" />
              N/A
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {error ? `Error: ${error}` : 'Sin datos forenses'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Sin eventos forenses registrados
  if (summary.totalEvents === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs bg-green-500 bg-opacity-10 border-green-500 border-opacity-30 text-green-700 cursor-default"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Sin eventos
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">No hay eventos forenses registrados para esta sesión</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Configuración de riesgo
  const riskConfig = {
    critical: {
      label: 'Crítico',
      icon: <XCircle className="h-3 w-3 mr-1" />,
      className:
        'bg-red-500 bg-opacity-10 text-red-700 border-red-500 border-opacity-30 hover:bg-opacity-15',
    },
    review: {
      label: 'Revisar',
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      className:
        'bg-yellow-500 bg-opacity-10 text-yellow-700 border-yellow-500 border-opacity-30 hover:bg-opacity-15',
    },
    normal: {
      label: 'Normal',
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      className:
        'bg-green-500 bg-opacity-10 text-green-700 border-green-500 border-opacity-30 hover:bg-opacity-15',
    },
  };

  const config = riskConfig[summary.riskLevel];

  // Tooltip content con desglose detallado
  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <p className="font-semibold">{config.label}</p>
      </div>
      
      <div className="space-y-1 text-xs">
        <p>
          <span className="font-medium">Total eventos:</span> {summary.totalEvents}
        </p>
        <div className="flex gap-3">
          <span className="text-red-400">● {summary.criticalCount} críticos</span>
          <span className="text-yellow-400">● {summary.warningCount} advertencia</span>
          <span className="text-foreground opacity-60">● {summary.infoCount} info</span>
        </div>
      </div>

      {/* Métricas clave */}
      {(summary.heartbeatMissedCount > 0 ||
        summary.webrtcFailedCount > 0 ||
        summary.clipboardActivityCount > 0 ||
        summary.tabHiddenCount > 0) && (
        <div className="border-t border-border pt-2 space-y-1 text-xs">
          <p className="font-medium">Métricas clave:</p>
          {summary.heartbeatMissedCount > 0 && (
            <p><HeartPulseIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Heartbeat missed: {summary.heartbeatMissedCount}</p>
          )}
          {summary.webrtcFailedCount > 0 && (
            <p><LinkIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> WebRTC failed: {summary.webrtcFailedCount}</p>
          )}
          {summary.clipboardActivityCount > 0 && (
            <p><ClipboardListIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> Clipboard activity: {summary.clipboardActivityCount}</p>
          )}
          {summary.tabHiddenCount > 0 && (
            <p><AlertCircleIcon className="inline-block h-4 w-4 shrink-0 align-middle text-red-600" aria-hidden="true" /> Tab hidden: {summary.tabHiddenCount}</p>
          )}
        </div>
      )}

      {/* Pattern sospechoso */}
      {summary.hasRapidDisconnectPattern && (
        <div className="border-t border-red-600 pt-2">
          <p className="text-xs text-red-700 font-medium">
            <AlertTriangle className="inline-block h-4 w-4 shrink-0 align-middle text-amber-600" aria-hidden="true" /> Pattern detectado: Desconexión rápida (&lt;5s)
          </p>
        </div>
      )}

      {/* Último evento crítico */}
      {summary.lastCriticalEvent && (
        <div className="border-t border-border pt-2 text-xs">
          <p className="font-medium">Último evento crítico:</p>
          <p className="text-foreground opacity-80">
            {summary.lastCriticalEvent.type}
          </p>
          <p className="text-foreground opacity-60 text-[10px]">
            {new Date(summary.lastCriticalEvent.timestamp).toLocaleString('es-ES')}
          </p>
        </div>
      )}

      {onClick && (
        <div className="border-t border-border pt-2">
          <p className="text-xs text-foreground opacity-60 italic">Click para ver timeline completo</p>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs transition-colors ${config.className} ${
              onClick ? 'cursor-pointer' : 'cursor-default'
            }`}
            onClick={onClick}
          >
            {config.icon}
            <span>{config.label}</span>
            <span className="ml-1.5 opacity-75">
              ({summary.totalEvents})
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-muted text-foreground border-border">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

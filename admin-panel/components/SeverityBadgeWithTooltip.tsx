import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertTriangle, XCircle } from 'lucide-react';

interface SeverityBadgeWithTooltipProps {
  severity: 'info' | 'warning' | 'critical';
  sourceConfidence?: 'high' | 'medium' | 'low' | 'unknown';
  className?: string;
}

/**
 * Badge de severidad con tooltip educativo
 * Neutraliza sesgo visual y proporciona contexto técnico
 */
export function SeverityBadgeWithTooltip({ 
  severity, 
  sourceConfidence,
  className = '' 
}: SeverityBadgeWithTooltipProps) {
  const baseBadgeClass = 'border border-border bg-blue-50/50 text-foreground/75';

  const severityConfig = {
    critical: {
      label: 'Crítico',
      className: baseBadgeClass,
      icon: <XCircle className="h-3 w-3 text-red-600" />,
      tooltip: 'Evento crítico ≠ fraude. Requiere revisión inmediata pero puede ser fallo técnico legítimo (VPN inestable, firewall, red móvil degradada).',
    },
    warning: {
      label: 'Advertencia',
      className: baseBadgeClass,
      icon: <AlertTriangle className="h-3 w-3 text-amber-700" />,
      tooltip: 'Señal de comportamiento atípico que debe revisarse en contexto. No implica intención maliciosa por sí sola.',
    },
    info: {
      label: 'Info',
      className: baseBadgeClass,
      icon: <Info className="h-3 w-3 text-blue-600" />,
      tooltip: 'Evento informativo. Parte del comportamiento normal de la sesión. Útil para reconstruir timeline.',
    },
  };

  const confidenceConfig: Record<string, { label: string; className: string; explanation: string }> = {
    high: {
      label: 'Alta confianza',
      className: baseBadgeClass,
      explanation: 'Señal directa del navegador/API con alta fiabilidad',
    },
    medium: {
      label: 'Media confianza',
      className: baseBadgeClass,
      explanation: 'Dato derivado de heurísticas o cálculos indirectos',
    },
    low: {
      label: 'Baja confianza',
      className: baseBadgeClass,
      explanation: 'Señal inferida con posible ruido o limitaciones de detección',
    },
    unknown: {
      label: 'Confianza N/A',
      className: baseBadgeClass,
      explanation: 'No se especificó nivel de confianza',
    },
  };

  const config = severityConfig[severity];
  const confConfig = sourceConfidence ? confidenceConfig[sourceConfidence] : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex max-w-full flex-wrap items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={`text-xs flex items-center gap-1 ${config.className} ${className}`}
              aria-label={`Severidad: ${config.label}`}
            >
              {config.icon}
              <span>{config.label}</span>
            </Badge>
            {confConfig && (
              <Badge 
                variant="outline" 
                className={`text-xs ${confConfig.className}`}
                aria-label={`Nivel de confianza: ${confConfig.label}`}
              >
                {confConfig.label}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs bg-card border border-border text-foreground shadow-xl"
          side="top"
        >
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold mb-1">Severidad: {config.label}</p>
              <p className="text-xs text-foreground opacity-80">{config.tooltip}</p>
            </div>
            {confConfig && (
              <>
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-semibold mb-1">{confConfig.label}</p>
                  <p className="text-xs text-foreground opacity-80">{confConfig.explanation}</p>
                </div>
              </>
            )}
            <div className="border-t border-border pt-2">
              <p className="text-[10px] text-foreground opacity-60 italic">
                Interpretar en conjunto con timeline completo y contexto operativo
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

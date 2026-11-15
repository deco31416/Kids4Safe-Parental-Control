import React, { useEffect, useState } from 'react';
import { AdminAPI } from '@/lib/admin-api';
import { eventDisplayLabel } from '@/lib/session-presentation';
import { formatSettingsDate } from '@/lib/settings-display';
import {
  Activity,
  Camera,
  Clipboard,
  Eye,
  EyeOff,
  Link,
  Mic,
  MicOff,
  Monitor,
  Target,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadgeWithTooltip } from '@/components/SeverityBadgeWithTooltip';

interface AuditLog {
  _id: string;
  timestamp: string;
  eventType: string;
  actorType: string;
  qrId?: string;
  sessionId?: string;
  metadata?: any;
  ip?: string;
  severity: 'info' | 'warning' | 'critical';
}

interface ForensicTimelineProps {
  sessionId: string;
}

/**
 * Componente Timeline Forense
 * Muestra eventos de auditoría cronológicamente con metadata completa
 */
export function ForensicTimeline({ sessionId }: ForensicTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await AdminAPI.getAuditLogs(`sessionId=${sessionId}&limit=500`);
        // Ordenar cronológicamente (más reciente primero)
        const sorted = (res.logs || []).sort(
          (a: AuditLog, b: AuditLog) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(sorted);
      } catch (err: any) {
        console.error('[ForensicTimeline] Error:', err);
        setError(err.message || 'Error al cargar eventos forenses');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchLogs();
    }
  }, [sessionId]);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">No se pudo cargar la actividad</p><p className="mt-1">{error}</p></div>;
  if (!logs.length) return <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">Esta sesión aún no tiene eventos de actividad registrados.</div>;
  return <div className="space-y-4">
    <details className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Acerca del registro de actividad</summary><p className="mt-2 leading-relaxed">Registro cronológico de eventos reportados durante la sesión. Cada evento conserva sus datos técnicos. La actividad debe interpretarse junto con el contexto de la sesión; un fallo de conexión no permite determinar la intención de una persona.</p></details>
    <div className="kids-forensic-list space-y-3">{logs.map(log => <ForensicEventCard key={log._id} log={log} />)}</div>
  </div>;
}
function ForensicEventCard({ log }: { log: AuditLog }) {
  const confidence = ['high', 'medium', 'low'].includes(log.metadata?.sourceConfidence) ? log.metadata.sourceConfidence : undefined;
  const count = log.metadata?.aggregationCount || 1;
  return <article className="min-w-0 rounded-2xl border border-border bg-white p-4">
    <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">{getEventIcon(log.eventType)}</span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold leading-relaxed">{eventDisplayLabel(log.eventType)}</h4><div className="mt-2 flex flex-wrap items-center gap-2"><SeverityBadgeWithTooltip severity={log.severity} sourceConfidence={confidence} />{count > 1 && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">×{count}</span>}</div><p className="mt-2 text-xs text-muted-foreground">{formatSettingsDate(log.timestamp)}</p></div></div>
    <details className="kids-forensic-details mt-3 min-w-0 border-t border-border pt-3"><summary className="cursor-pointer text-xs font-semibold text-primary">Ver datos del evento</summary><div className="mt-3 min-w-0 space-y-3 rounded-xl bg-muted/40 p-3"><dl className="kids-session-definition text-xs"><div><dt>Tipo de evento</dt><dd className="font-mono">{log.eventType}</dd></div><div><dt>Origen</dt><dd>{log.actorType || 'No reportado'}</dd></div>{log.ip && <div><dt>Dirección IP</dt><dd className="font-mono">{log.ip}</dd></div>}</dl>{log.metadata && Object.keys(log.metadata).length > 0 ? <pre className="max-h-64 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-white p-3 font-mono text-[11px] leading-relaxed text-foreground/75 [overflow-wrap:anywhere]">{JSON.stringify(log.metadata, null, 2)}</pre> : <p className="text-xs text-muted-foreground">Sin datos adicionales.</p>}</div></details>
  </article>;
}

function getEventIcon(eventType: string): React.ReactNode {
  if (eventType.includes('AUDIO')) return <Mic className="h-5 w-5" />;
  if (eventType.includes('CAMERA') || eventType.includes('CAPTURE')) return <Camera className="h-5 w-5" />;
  // Tab Visibility (6 eventos)
  if (
    eventType === 'TAB_HIDDEN' ||
    eventType === 'TAB_VISIBLE' ||
    eventType === 'WINDOW_BLUR' ||
    eventType === 'WINDOW_FOCUS' ||
    eventType === 'PAGE_HIDE' ||
    eventType === 'BEFORE_UNLOAD'
  ) {
    if (eventType === 'TAB_HIDDEN' || eventType === 'WINDOW_BLUR' || eventType === 'PAGE_HIDE') {
      return <EyeOff className="h-5 w-5" />;
    }
    return <Eye className="h-5 w-5" />;
  }

  // Heartbeat (2 eventos)
  if (eventType === 'HEARTBEAT_DELAYED' || eventType === 'HEARTBEAT_MISSED') {
    return <Activity className="h-5 w-5" />;
  }

  // WebRTC (3 eventos)
  if (
    eventType === 'WEBRTC_CONNECTED' ||
    eventType === 'WEBRTC_DISCONNECTED' ||
    eventType === 'WEBRTC_CONNECTION_FAILED' ||
    eventType === 'WEBRTC_FAILED'
  ) {
    return <Link className="h-5 w-5" />;
  }

  // Media Track (3 eventos)
  if (
    eventType === 'TRACK_MUTED' ||
    eventType === 'TRACK_UNMUTED' ||
    eventType === 'TRACK_ENDED'
  ) {
    if (eventType === 'TRACK_MUTED') return <MicOff className="h-5 w-5" />;
    return <Mic className="h-5 w-5" />;
  }

  // Clipboard (4 eventos)
  if (
    eventType === 'CLIPBOARD_COPY' ||
    eventType === 'CLIPBOARD_PASTE' ||
    eventType === 'CLIPBOARD_CUT' ||
    eventType === 'SCREENSHOT_ATTEMPT'
  ) {
    if (eventType === 'SCREENSHOT_ATTEMPT') return <Camera className="h-5 w-5" />;
    return <Clipboard className="h-5 w-5" />;
  }

  // Otros eventos (session lifecycle, permissions, etc.)
  if (eventType.includes('SESSION')) {
    return <Target className="h-5 w-5" />;
  }
  if (eventType.includes('PERMISSION')) {
    return <Monitor className="h-5 w-5" />;
  }
  if (eventType.includes('STREAM')) {
    return <Monitor className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}


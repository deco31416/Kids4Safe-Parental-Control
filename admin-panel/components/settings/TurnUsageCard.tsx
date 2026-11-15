'use client';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Gauge, History, RadioTower, RefreshCw, Server, WalletCards } from 'lucide-react';
import { AdminAPI, type TurnUsageSnapshot, type TurnUsageSummary } from '@/lib/admin-api';
import { configuredPeriodExpired, formatSettingsDate } from '@/lib/settings-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsEmptyState, SettingsMetric, SettingsNotice } from './SettingsPrimitives';
function formatGb(value: number) { return Number.isFinite(value) ? `${value.toFixed(value < 1 ? 3 : 2)} GB` : '—'; }
function configuredDate(value?: string | null) {
  if (!value) return 'Sin definir';
  const date = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return date ? `${date[3]}/${date[2]}/${date[1]}` : 'Fecha no disponible';
}
export function TurnUsageCard({ compact = false }: { compact?: boolean }) {
  const [usage, setUsage] = useState<TurnUsageSummary | null>(null);
  const [history, setHistory] = useState<TurnUsageSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadUsage = useCallback(async () => {
    setLoading(true); setError(null); setHistoryError(null);
    const [current, snapshots] = await Promise.allSettled([AdminAPI.getTurnUsage(), compact ? Promise.resolve([]) : AdminAPI.getTurnHistory(6)]);
    if (current.status === 'fulfilled') setUsage(current.value);
    else { setUsage(null); setError(current.reason instanceof Error ? current.reason.message : 'No se pudo cargar el consumo de TURN.'); }
    if (snapshots.status === 'fulfilled') setHistory(snapshots.value);
    else { setHistory([]); setHistoryError('No se pudo cargar el historial. Puedes volver a consultar con Actualizar.'); }
    setLoading(false);
  }, [compact]);
  useEffect(() => { void loadUsage(); }, [loadUsage]);
  const percent = usage && Number.isFinite(usage.usagePercent) ? Math.round(usage.usagePercent) : 0;
  const local = usage?.source !== 'metered-api';
  const visibleHistory = history.filter((point, index, items) => items.findIndex(candidate => candidate.checkedAt === point.checkedAt && candidate.usagePercent === point.usagePercent) === index);
  return <Card className="kids-settings-card"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><RadioTower className="h-5 w-5 text-primary" />TURN Metered</CardTitle><CardDescription>Consumo, cuota y consultas del relay WebRTC.</CardDescription></div><Button variant="outline" size="sm" className="gap-2" onClick={() => void loadUsage()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar consumo</Button></div></CardHeader>
    <CardContent className="space-y-5">
      {error && <SettingsNotice tone="error">{error}</SettingsNotice>}
      {usage ? <>
        <SettingsNotice tone={local ? 'info' : percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'}>{local ? 'Control local activo. La cuota y el consumo corresponden a la configuración del sistema; no son una lectura directa de Metered.' : percent >= 90 ? 'Uso crítico: revisa la cuota disponible para mantener el servicio.' : percent >= 70 ? 'El consumo es alto. Revisa la cuota antes del siguiente corte.' : 'La última lectura de Metered se encuentra dentro de la cuota.'}</SettingsNotice>
        {configuredPeriodExpired(usage.periodEnd) && <SettingsNotice tone="warning">La fecha de corte configurada ya pasó ({configuredDate(usage.periodEnd)}). Verifica que el periodo del plan esté actualizado.</SettingsNotice>}
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <div className="kids-content-card rounded-2xl border border-blue-100 bg-gradient-to-br from-[#F1F8FF] to-teal-50/40 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">Plan configurado</p><h3 className="mt-1 text-lg font-bold">{usage.planName}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${local ? 'bg-white text-primary' : 'bg-teal-100 text-teal-800'}`}>{local ? 'Configuración local' : 'Lectura de Metered'}</span></div>
              <div className="mt-5 flex items-baseline justify-between gap-3"><span className="text-sm text-muted-foreground">Consumo de la cuota</span><strong className="text-2xl font-bold">{percent}%</strong></div>
              <div role="progressbar" aria-label="Consumo de la cuota TURN" aria-valuenow={Math.max(0, Math.min(percent, 100))} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary to-[#20B9BE]'}`} style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} /></div>
              <p className="mt-3 text-xs text-muted-foreground">Metered · {usage.region}</p>
            </div>
            <div className="grid grid-cols-2 gap-3"><SettingsMetric label="Usado" value={formatGb(usage.usageGb)} icon={<Gauge className="h-4 w-4" />} /><SettingsMetric label="Cuota" value={formatGb(usage.quotaGb)} icon={<WalletCards className="h-4 w-4" />} /><SettingsMetric label="Restante" value={formatGb(usage.remainingGb)} icon={<Server className="h-4 w-4" />} /><SettingsMetric label="Exceso" value={formatGb(usage.overageGb)} icon={<AlertTriangle className="h-4 w-4" />} /></div>
          </div>
          <aside className="kids-content-card space-y-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" />Periodo y lectura</h3><dl className="space-y-4 text-sm">{[['Activación', configuredDate(usage.activatedAt)], ['Corte configurado', configuredDate(usage.periodEnd)], ['Última consulta', formatSettingsDate(usage.lastCheckedAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl><p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{local ? 'Actualiza la integración de Metered para consultar el consumo del proveedor.' : 'Los valores corresponden a la última consulta disponible.'}</p></aside>
        </div>
      </> : <SettingsEmptyState title={loading ? 'Consultando consumo' : 'Consumo no disponible'} description={loading ? 'Estamos recuperando la información de TURN.' : 'Usa Actualizar consumo para volver a consultar el servicio.'} icon={<RadioTower className={`h-6 w-6 ${loading ? 'animate-pulse' : ''}`} />} />}
      {!compact && <section className="space-y-3 border-t border-border pt-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />Historial de consultas</h3>{historyError && <SettingsNotice tone="warning">{historyError}</SettingsNotice>}
        {visibleHistory.length > 0 ? <div className="grid gap-2 md:grid-cols-2">{visibleHistory.map(point => <div key={point._id || `${point.checkedAt}-${point.usagePercent}`} className="kids-content-card flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"><div className="min-w-0"><p className="text-xs font-medium">{formatSettingsDate(point.checkedAt)}</p><p className="mt-1 text-[11px] text-muted-foreground">{point.source === 'metered-api' ? 'Lectura de Metered' : 'Configuración local'}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">{Math.round(point.usagePercent)}%</span></div>)}</div> : !loading && !historyError && <p className="text-sm text-muted-foreground">Aún no hay consultas guardadas.</p>}
      </section>}
    </CardContent>
  </Card>;
}

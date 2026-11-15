'use client';
import { useState } from 'react';
import { ArrowUpRight, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SERVICE_LABELS, safeServiceEndpoint, serviceState, serviceTotals, formatSettingsDate, type ServiceState } from '@/lib/settings-display';
import type { HealthServiceStatus } from './types';
import type { ServiceEntry } from './system-status.catalog';
const tones: Record<ServiceState, string> = { up: 'bg-teal-50 text-teal-700 border-teal-100', degraded: 'bg-amber-50 text-amber-700 border-amber-100', down: 'bg-red-50 text-red-700 border-red-100', 'not-configured': 'bg-muted text-muted-foreground border-border', 'not-reported': 'bg-muted text-muted-foreground border-border' };
function ServiceCard({ entry, service }: { entry: ServiceEntry; service?: HealthServiceStatus }) {
  const [open, setOpen] = useState(false);
  const status = serviceState(service);
  const endpoint = safeServiceEndpoint(service?.url);
  const Icon = entry.Icon;
  const details = [
    ['Estado', SERVICE_LABELS[status]], ['Conexión', typeof service?.connected === 'boolean' ? service.connected ? 'Conectado' : 'Sin conexión' : 'No reportada'],
    ['Configuración', typeof service?.configured === 'boolean' ? service.configured ? 'Configurado' : 'Sin configurar' : 'No reportada'],
    ['Dirección', endpoint || (entry.fallbackPort ? `Puerto esperado ${entry.fallbackPort}` : 'No reportada')],
    ['Respuesta', typeof service?.responseTime === 'number' ? `${service.responseTime} ms` : 'No reportada'],
    ['Actividad del servicio', typeof service?.uptime === 'number' ? `${Math.round(service.uptime)} segundos` : 'No reportada'],
    ['Última comprobación', formatSettingsDate(service?.lastCheck)],
  ];
  return <article className="kids-settings-service flex min-w-0 flex-col rounded-2xl border border-border bg-white p-4">
    <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold">{entry.label}</h4>{entry.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>}</div></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{SERVICE_LABELS[status]}</span>{typeof service?.responseTime === 'number' && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{service.responseTime} ms</span>}</div>
    {service?.error && <p className="mt-3 break-words text-xs leading-relaxed text-red-700">{service.error}</p>}
    <Button variant="ghost" size="sm" className="mt-3 justify-between gap-2 px-0 text-xs text-primary hover:bg-transparent" onClick={() => setOpen(true)} aria-label={`Ver conexión de ${entry.label}`}>Ver conexión<ArrowUpRight className="h-3.5 w-3.5" /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="kids-settings-dialog"><DialogHeader><DialogTitle className="flex items-center gap-2 pr-5"><Icon className="h-5 w-5 text-primary" />{entry.label}</DialogTitle><DialogDescription>Detalle de la última respuesta reportada por el sistema.</DialogDescription></DialogHeader>
      <dl className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">{details.map(([label, value]) => <div key={label} className="grid min-w-0 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
      {service?.error && <p role="alert" className="break-words rounded-xl bg-red-50 p-3 text-sm text-red-700">{service.error}</p>}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Los datos corresponden a la última consulta del backend.</p>
    </DialogContent></Dialog>
  </article>;
}
export function SystemStatusSection({ title, description, entries, statuses }: { title: string; description: string; entries: ServiceEntry[]; statuses?: Record<string, HealthServiceStatus> }) {
  const totals = serviceTotals(entries.map(entry => entry.key), statuses);
  return <section className="kids-content-card space-y-4 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-xl"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div><span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-muted-foreground">{entries.length} servicios</span></div>
    <div className="flex flex-wrap gap-2">{(Object.keys(totals) as ServiceState[]).filter(state => totals[state] > 0).map(state => <span key={state} className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[state]}`}>{SERVICE_LABELS[state]} · {totals[state]}</span>)}</div>
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{entries.map(entry => <ServiceCard key={entry.key} entry={entry} service={statuses?.[entry.key]} />)}</div>
  </section>;
}

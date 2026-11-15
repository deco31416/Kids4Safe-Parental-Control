'use client';
import type { ActiveSession } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { EmergencyCard, type EmergencyActions } from './EmergencyCard';
import { DashboardPager } from './DashboardPager';
type Status = 'all' | 'active' | 'finished';
export function EmergencyHistoryPanel({ activeOnly, emergencies, status, onStatus, page, onPage, pageSize, ...actions }: EmergencyActions & {
  activeOnly: boolean; emergencies: ActiveSession[]; status: Status; onStatus: (status: Status) => void; page: number; onPage: (page: number) => void; pageSize: number;
}) {
  const filtered = activeOnly ? emergencies : emergencies.filter(s => status === 'all' || (status === 'active' ? s.status === 'active' : s.status !== 'active'));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  return <section className="space-y-4" aria-label={activeOnly ? 'Auxilios activos' : 'Auxilios recientes'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!activeOnly && <div className="flex max-w-full flex-wrap gap-1 rounded-xl border bg-card p-1">
        {([{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Activos' }, { value: 'finished', label: 'Finalizados' }] as const).map(option =>
          <Button key={option.value} size="sm" variant={status === option.value ? 'default' : 'ghost'} aria-pressed={status === option.value} onClick={() => onStatus(option.value)}>{option.label}</Button>)}
      </div>}
      <p className="text-sm text-muted-foreground">{filtered.length} {activeOnly ? 'auxilios activos' : 'registros recientes'}</p>
    </div>
    {filtered.length ? <>
      <DashboardPager page={currentPage} total={filtered.length} pageSize={pageSize} onPage={onPage} />
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(session => <EmergencyCard key={session.sessionId} session={session} {...actions} />)}</div>
    </> : <div className="kids-panel-card grid justify-items-center gap-3 border p-8 text-center">
      <span className="rounded-2xl bg-teal-50 p-3 text-teal-600"><ShieldCheck className="h-7 w-7" /></span>
      <h2 className="font-semibold">{activeOnly ? 'Sin emergencias activas' : 'No hay auxilios para este filtro'}</h2>
      <p className="text-sm text-muted-foreground">{activeOnly ? 'Las alertas nuevas aparecerán aquí con prioridad.' : 'Los registros recientes aparecerán aquí cuando estén disponibles.'}</p>
    </div>}
  </section>;
}

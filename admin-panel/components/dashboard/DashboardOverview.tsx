'use client';
import Link from 'next/link';
import { ArrowRight, History, MapPin, ShieldCheck, Siren, Smartphone, Users } from 'lucide-react';
import type { ActiveSession, MobileAppProfile } from '@/lib/admin-api';
import type { MobilePerson } from '@/lib/dashboard-data';
import { dashboardHref } from '@/lib/dashboard-navigation';
import { Button } from '@/components/ui/button';

export function DashboardOverview({ people, units, emergencies, onView, onLive }: {
  people: MobilePerson[]; units: MobileAppProfile[]; emergencies: ActiveSession[]; onView: (id: string) => void; onLive: (id: string) => void;
}) {
  const active = emergencies.filter(s => s.status === 'active');
  const finished = emergencies.filter(s => s.status !== 'active');
  const stats = [
    { label: 'Personas registradas', count: people.length, icon: Users, view: 'people' as const, color: 'bg-blue-50 text-primary' },
    { label: 'Dispositivos vinculados', count: units.length, icon: Smartphone, view: 'devices' as const, color: 'bg-teal-50 text-teal-600' },
    { label: 'Auxilios activos', count: active.length, icon: Siren, view: 'emergencies' as const, color: active.length ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-primary' },
  ];
  return <div className="space-y-4">
    <section aria-label="Resumen de seguridad" className="grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-3">
      {stats.map(stat => <Link key={stat.view} href={dashboardHref(stat.view)} className="kids-panel-card group flex items-center gap-4 border p-4 transition-shadow hover:shadow-md min-[400px]:flex-col min-[400px]:items-start sm:flex-row sm:items-center sm:p-5">
        <span className={`rounded-2xl p-3 ${stat.color}`}><stat.icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><p className="text-3xl font-bold tabular-nums">{stat.count}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.label}</p></div>
      </Link>)}
    </section>
    <section className="kids-panel-card space-y-4 border p-4 sm:p-5" aria-label="Emergencias en tiempo real">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Siren className="h-5 w-5 text-primary" />Centro de emergencias</h2>
        <Link href={dashboardHref('emergencies')} className={`rounded-full px-3 py-1 text-xs font-medium ${active.length ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{active.length} activas</Link>
      </div>
      {active.length ? <div className="space-y-2">
        {active.slice(0, 3).map(session => <div key={session.sessionId} className="kids-content-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-4">
          <div className="min-w-0"><p className="break-words font-semibold">{session.mobile?.deviceLabel || 'Kids4Safe Mobile'}</p><p className="mt-1 text-xs text-red-700">Auxilio activo · Atención prioritaria</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onView(session.sessionId)}>Ver detalles</Button><Button size="sm" onClick={() => onLive(session.sessionId)}>En vivo</Button></div>
        </div>)}
        <Link href={dashboardHref('emergencies')} className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-primary">Ver todos los auxilios<ArrowRight className="h-4 w-4" /></Link>
      </div> : <div className="kids-content-card flex flex-col items-center gap-2 rounded-2xl border border-teal-100 bg-gradient-to-br from-[#F1F8FF] to-teal-50/50 px-4 py-7 text-center">
        <span className="mb-1 rounded-full bg-white p-3 text-teal-600 shadow-sm"><ShieldCheck className="h-7 w-7" /></span>
        <h3 className="font-semibold">Sin emergencias activas</h3><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Las alertas nuevas aparecerán aquí con prioridad.</p>
      </div>}
    </section>
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="kids-panel-card space-y-4 border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-semibold"><Smartphone className="h-5 w-5 text-primary" />Dispositivos y personas</h2><Link href={dashboardHref('people')} className="text-xs font-semibold text-primary">Ver todos</Link></div>
        {people.length ? people.slice(0, 3).map(person => <Link key={person.key} href={dashboardHref('people')} className="kids-content-card flex min-w-0 items-start gap-3 rounded-2xl border border-border p-3 hover:bg-muted/50">
          <span className="rounded-xl bg-blue-50 p-2 text-primary"><Users className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{person.primary.fullName || person.primary.deviceLabel || 'Kids4Safe Mobile'}</p><p className="mt-1 text-xs text-muted-foreground">{person.units.length} {person.units.length === 1 ? 'dispositivo vinculado' : 'dispositivos vinculados'}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
        </Link>) : <p className="text-sm text-muted-foreground">Aún no hay personas registradas.</p>}
        <Link href={dashboardHref('locations')} className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><MapPin className="h-4 w-4" />Consultar ubicaciones</Link>
      </section>
      <section className="kids-panel-card space-y-4 border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-semibold"><History className="h-5 w-5 text-primary" />Historial de auxilios</h2><Link href={dashboardHref('history')} className="text-xs font-semibold text-primary">Ver todos</Link></div>
        <p className="text-xs text-muted-foreground">{finished.length} auxilios finalizados entre los registros recientes</p>
        {emergencies.length ? <div className="divide-y divide-border">{emergencies.slice(0, 3).map(session => <button key={session.sessionId} onClick={() => onView(session.sessionId)} className="kids-content-card flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-3 text-left hover:bg-muted/50">
          <span className="min-w-0"><span className="block text-xs text-muted-foreground">{session.createdAt ? new Date(session.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'}</span><span className="mt-1 block break-words text-sm font-medium">{session.mobile?.deviceLabel || 'Kids4Safe Mobile'}</span></span><span className={`rounded-full px-2.5 py-1 text-xs ${session.status === 'active' ? 'bg-red-50 text-red-700' : 'bg-muted text-muted-foreground'}`}>{session.status === 'active' ? 'Activo' : 'Finalizado'}</span>
        </button>)}</div> : <p className="py-3 text-sm text-muted-foreground">Aún no hay auxilios registrados.</p>}
      </section>
    </div>
  </div>;
}

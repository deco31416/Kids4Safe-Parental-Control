'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { ActiveSession, MobileAppProfile } from '@/lib/admin-api';
import type { MobilePerson } from '@/lib/dashboard-data';
import { MobileProfileCard } from './MobileProfileCard';
import { DashboardPager } from './DashboardPager';
export function MobileDirectoryPanel({ mode, people, units, sessions, search, onSearch, page, onPage, pageSize, onViewSession }: {
  mode: 'people' | 'devices' | 'locations'; people: MobilePerson[]; units: MobileAppProfile[]; sessions: Map<string, ActiveSession>;
  search: string; onSearch: (value: string) => void; page: number; onPage: (page: number) => void; pageSize: number; onViewSession: (id: string) => void;
}) {
  const [devicePage, setDevicePage] = useState(1);
  useEffect(() => setDevicePage(1), [search, mode]);
  const normalized = search.trim().toLowerCase();
  const filteredUnits = units.filter(unit => !normalized || [unit.fullName, unit.phone, unit.securityId, unit.mobileUnitId, unit.deviceLabel, unit.platform, unit.emergencyContact?.name, unit.emergencyContact?.phone].some(value => value?.toLowerCase().includes(normalized)));
  const isPeople = mode === 'people';
  const count = isPeople ? people.length : filteredUnits.length;
  const currentPage = Math.min(isPeople ? page : devicePage, Math.max(1, Math.ceil(count / pageSize)));
  const start = (currentPage - 1) * pageSize;
  return <section className="space-y-4" aria-label={isPeople ? 'Directorio de personas' : mode === 'locations' ? 'Ubicaciones de dispositivos' : 'Directorio de dispositivos'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="relative block w-full sm:max-w-sm"><span className="sr-only">Buscar persona o dispositivo</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar persona o dispositivo" className="h-10 w-full border pl-10 pr-3 text-sm" /></label>
      <p className="text-sm text-muted-foreground">{count} {isPeople ? count === 1 ? 'persona' : 'personas' : count === 1 ? 'dispositivo' : 'dispositivos'}</p>
    </div>
    {mode === 'locations' && <p className="kids-content-card rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Se muestra la última ubicación guardada de cada dispositivo. Su fecha aparece en la tarjeta.</p>}
    <DashboardPager page={currentPage} total={count} pageSize={pageSize} onPage={isPeople ? onPage : setDevicePage} />
    {count ? <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {isPeople ? people.slice(start, start + pageSize).map(person => <MobileProfileCard key={person.key} units={person.units} primary={person.primary} sessions={sessions} onViewSession={onViewSession} />)
        : filteredUnits.slice(start, start + pageSize).map(unit => <MobileProfileCard key={unit.mobileUnitId} units={[unit]} primary={unit} sessions={sessions} device location={mode === 'locations'} onViewSession={onViewSession} />)}
    </div> : <div className="kids-panel-card border p-8 text-center text-sm text-muted-foreground">{search ? 'No hay resultados para esta búsqueda.' : isPeople ? 'Aún no hay personas registradas.' : 'Aún no hay dispositivos vinculados.'}</div>}
  </section>;
}

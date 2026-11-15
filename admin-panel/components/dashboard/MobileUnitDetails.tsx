'use client';
import { useState } from 'react';
import type { ActiveSession, MobileAppProfile } from '@/lib/admin-api';
import { hasUnitLocation, unitMapsUrl } from '@/lib/dashboard-data';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, MapPin } from 'lucide-react';
export function MobileUnitDetails({ unit, session, onViewSession }: { unit: MobileAppProfile; session?: ActiveSession; onViewSession: (id: string) => void }) {
  const [visibleDetails, setVisibleDetails] = useState<Record<string, boolean>>({});
  const hasLocation = hasUnitLocation(unit);
  const mapsUrl = unitMapsUrl(unit);
  const gpsActive = unit.gpsAlwaysEnabled || (session?.status === 'active' && (session.permissions?.location || session.capabilities?.background?.gps));
  const details = [
    ['Unidad', unit.mobileUnitId], ['Identificador', unit.securityId || 'Sin identificador'],
    ['Plataforma', unit.platform || 'No disponible'], ['Versión de app', unit.appVersion || 'No disponible'],
    ['Teléfono', unit.phone || 'Sin teléfono'], ['Estado GPS', gpsActive ? 'GPS activo' : hasLocation ? 'Ubicación guardada' : 'Sin ubicación'],
    ['Última ubicación', hasLocation ? `${unit.lastLocation!.latitude.toFixed(5)}, ${unit.lastLocation!.longitude.toFixed(5)}` : 'Sin ubicación'],
    ['Fecha de ubicación', unit.lastLocation?.updatedAt ? new Date(unit.lastLocation.updatedAt).toLocaleString() : unit.lastLocation?.timestampMs ? new Date(unit.lastLocation.timestampMs).toLocaleString() : 'Sin fecha disponible'],
    ['Última actividad', unit.lastSeenAt ? new Date(unit.lastSeenAt).toLocaleString() : 'Sin actividad'],
    ['Última sesión', unit.lastSessionId || 'Sin auxilio'],
    ['Contacto de emergencia', unit.emergencyContact?.name || 'Sin contacto'],
    ['Teléfono del contacto', unit.emergencyContact?.phone || 'Sin teléfono'],
  ];
  const privateFields: Record<string, { hiddenText: string; accessibleName: string } | undefined> = {
    'Última ubicación': hasLocation ? { hiddenText: 'Coordenadas ocultas', accessibleName: 'coordenadas' } : undefined,
    'Contacto de emergencia': { hiddenText: 'Contacto oculto', accessibleName: 'contacto de emergencia' },
    'Teléfono del contacto': { hiddenText: 'Teléfono oculto', accessibleName: 'teléfono del contacto' },
  };
  return <article className="min-w-0 rounded-2xl border border-border bg-muted/30 p-4">
    <h3 className="break-words font-semibold">{unit.deviceLabel || unit.platform || 'Dispositivo móvil'}</h3>
    <dl className="mt-4 space-y-3 text-sm">{details.map(([label, value]) => {
      const privateField = privateFields[label];
      const visible = visibleDetails[label] === true;
      const toggleLabel = privateField ? (visible ? 'Ocultar ' : 'Mostrar ') + privateField.accessibleName : undefined;
      return <div key={label} className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="min-w-0 break-words [overflow-wrap:anywhere]">{privateField ? <div className="flex items-center justify-between gap-3">
          <span aria-live="polite">{visible ? value : privateField.hiddenText}</span>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-primary" aria-label={toggleLabel} title={toggleLabel} aria-pressed={visible} onClick={() => setVisibleDetails(previous => ({ ...previous, [label]: !previous[label] }))}>
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div> : value}</dd>
      </div>;
    })}</dl>
    <div className="mt-4 flex flex-wrap gap-2">
      {mapsUrl && <Button asChild variant="outline" size="sm"><a href={mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="mr-2 h-4 w-4" />Ver GPS</a></Button>}
      {session && <Button variant="outline" size="sm" onClick={() => onViewSession(session.sessionId)}>Ver detalles del auxilio</Button>}
    </div>
  </article>;
}

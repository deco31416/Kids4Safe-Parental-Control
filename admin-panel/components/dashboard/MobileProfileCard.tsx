'use client';
import { useState } from 'react';
import { Eye, EyeOff, MapPin, Smartphone, UserRound } from 'lucide-react';
import type { ActiveSession, MobileAppProfile } from '@/lib/admin-api';
import { hasUnitLocation, unitMapsUrl } from '@/lib/dashboard-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MobileUnitDetails } from './MobileUnitDetails';
export function MobileProfileCard({ units, primary, sessions, device, location, onViewSession }: {
  units: MobileAppProfile[]; primary: MobileAppProfile; sessions: Map<string, ActiveSession>; device?: boolean; location?: boolean; onViewSession: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coordinatesVisible, setCoordinatesVisible] = useState(false);
  const name = primary.fullName || primary.deviceLabel || 'Kids4Safe Mobile';
  const session = sessions.get(primary.mobileUnitId);
  const gpsActive = primary.gpsAlwaysEnabled || (session?.status === 'active' && (session.permissions?.location || session.capabilities?.background?.gps));
  const hasLocation = hasUnitLocation(primary);
  const mapsUrl = unitMapsUrl(primary);
  const avatar = primary.avatarThumbnailUrl || primary.avatarUri;
  const title = device ? primary.deviceLabel || primary.platform || 'Dispositivo móvil' : name;
  return <article className="kids-panel-card flex min-w-0 flex-col gap-4 border p-4 sm:p-5">
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-primary">
        {!device && avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : device ? <Smartphone className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
      </div>
      <div className="min-w-0"><h2 className="break-words text-sm font-semibold">{title}</h2><p className="mt-1 break-words text-xs text-muted-foreground">{device ? name : primary.phone || 'Sin teléfono'}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={`rounded-full px-2.5 py-1 ${gpsActive ? 'bg-teal-50 text-teal-700' : hasLocation ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground'}`}>{gpsActive ? 'GPS activo' : hasLocation ? 'Último GPS' : 'Sin GPS'}</span>
      <span className="text-muted-foreground">{device ? primary.platform || 'Plataforma no disponible' : `${units.length} ${units.length === 1 ? 'dispositivo vinculado' : 'dispositivos vinculados'}`}</span>
    </div>
    {location && <div className="kids-content-card flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium" aria-live="polite"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{hasLocation ? coordinatesVisible ? `${primary.lastLocation!.latitude.toFixed(5)}, ${primary.lastLocation!.longitude.toFixed(5)}` : 'Coordenadas ocultas' : 'Sin ubicación guardada'}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{primary.lastLocation?.updatedAt ? new Date(primary.lastLocation.updatedAt).toLocaleString() : primary.lastLocation?.timestampMs ? new Date(primary.lastLocation.timestampMs).toLocaleString() : 'Sin fecha de ubicación disponible'}</p>
      </div>
      {hasLocation && <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-primary" aria-label={coordinatesVisible ? 'Ocultar coordenadas' : 'Mostrar coordenadas'} title={coordinatesVisible ? 'Ocultar coordenadas' : 'Mostrar coordenadas'} aria-pressed={coordinatesVisible} onClick={() => setCoordinatesVisible(visible => !visible)}>
        {coordinatesVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </Button>}
    </div>}
    {device && <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">{primary.mobileUnitId}</p>}
    <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="outline" size="sm">Ver detalles</Button></DialogTrigger>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader className="pr-6"><DialogTitle>{title}</DialogTitle><DialogDescription>{device ? 'Información y herramientas del dispositivo.' : `${units.length} ${units.length === 1 ? 'dispositivo vinculado' : 'dispositivos vinculados'} y contacto de emergencia.`}</DialogDescription></DialogHeader>
          <div className="min-w-0 space-y-3">{units.map(unit => <MobileUnitDetails key={unit.mobileUnitId} unit={unit} session={sessions.get(unit.mobileUnitId)} onViewSession={id => { setOpen(false); onViewSession(id); }} />)}</div>
        </DialogContent>
      </Dialog>
      {mapsUrl && <Button asChild variant="outline" size="sm"><a href={mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="mr-1.5 h-4 w-4" />Ver GPS</a></Button>}
    </div>
  </article>;
}

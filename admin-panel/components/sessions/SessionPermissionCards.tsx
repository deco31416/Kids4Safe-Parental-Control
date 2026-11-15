import { Camera, MapPin, Mic, Monitor } from 'lucide-react';
import type { ActiveSession } from '@/lib/admin-api';
import { permissionDisplayState } from '@/lib/session-presentation';
import { SessionStatusPill } from './SessionStatusPill';
export function SessionPermissionCards({ session }: { session: ActiveSession }) {
  const entries = [
    { name: 'Cámara', Icon: Camera, permission: session.permissions?.camera, live: !!(session as any).streams?.camera, liveLabel: 'Transmitiendo' },
    { name: 'Micrófono', Icon: Mic, permission: session.permissions?.microphone },
    { name: 'Pantalla', Icon: Monitor, permission: session.permissions?.screen, live: !!(session as any).streams?.screen, liveLabel: 'Compartiendo' },
    { name: 'Ubicación', Icon: MapPin, permission: session.permissions?.location },
  ];
  return <section aria-label="Permisos reportados" className="space-y-4"><p className="text-sm leading-relaxed text-muted-foreground">Estado reportado por el dispositivo. Un permiso concedido no significa que esté transmitiendo.</p><div className="grid min-w-0 gap-3 sm:grid-cols-2">{entries.map(({ name, Icon, permission, live, liveLabel }) => {
    const state = permissionDisplayState(permission, live);
    return <article key={name} className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-white p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 space-y-2"><h3 className="text-sm font-semibold">{name}</h3><SessionStatusPill tone={state === 'live' ? 'teal' : state === 'granted' ? 'blue' : 'neutral'}>{state === 'live' ? liveLabel : state === 'granted' ? 'Acceso concedido' : state === 'denied' ? 'Sin acceso' : 'Sin información'}</SessionStatusPill></div></article>;
  })}</div></section>;
}

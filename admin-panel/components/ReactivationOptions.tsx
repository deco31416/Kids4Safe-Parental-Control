'use client';

import { Camera, CheckCircle2, MapPin, Mic, Monitor } from 'lucide-react';
import type { PushFormState, ReactivateTarget } from './push-notification.types';

type Props = {
  form: PushFormState;
  toggleTarget: (target: ReactivateTarget) => void;
  update: <K extends keyof PushFormState>(key: K, value: PushFormState[K]) => void;
};

const options = [
  { value: 'camera', label: 'Cámara', Icon: Camera },
  { value: 'microphone', label: 'Micrófono', Icon: Mic },
  { value: 'screen', label: 'Pantalla', Icon: Monitor },
  { value: 'location', label: 'Ubicación', Icon: MapPin },
] satisfies Array<{ value: ReactivateTarget; label: string; Icon: typeof Camera }>;

export function ReactivationOptions({ form, toggleTarget, update }: Props) {
  const allSelected = form.reactivateTargets.length === options.length;
  return (
    <div className="mb-6 rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground/90">Solicitar servicios al usuario</p>
        </div>
        <button type="button" onClick={() => update('reactivateTargets', allSelected ? [] : options.map(({ value }) => value))} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground/80">
          <CheckCircle2 className="h-4 w-4" /> {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(({ value, label, Icon }) => {
          const selected = form.reactivateTargets.includes(value);
          return (
            <button key={value} type="button" onClick={() => toggleTarget(value)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selected ? 'border-blue-400/50 bg-blue-500/15 text-foreground' : 'border-border text-foreground/70'}`}>
              <Icon className="h-4 w-4" /><span className="text-sm font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-sm font-medium text-foreground/80" htmlFor="push-expiry">Vencimiento de la solicitud</label>
      <select id="push-expiry" value={form.expiresInSeconds} onChange={(event) => update('expiresInSeconds', Number(event.target.value))} className="mt-2 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground">
        <option value={300}>5 minutos</option><option value={900}>15 minutos</option><option value={1800}>30 minutos</option><option value={3600}>1 hora</option>
      </select>
    </div>
  );
}

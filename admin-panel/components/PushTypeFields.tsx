'use client';

import { AlertCircle, FileText, Gift, Image, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PushFormState, PushType } from './push-notification.types';

type Props = {
  form: PushFormState;
  update: <K extends keyof PushFormState>(key: K, value: PushFormState[K]) => void;
};

const types = [
  { value: 'text', label: 'Texto', Icon: FileText },
  { value: 'image', label: 'Imagen', Icon: Image },
  { value: 'pdf', label: 'PDF', Icon: FileText },
  { value: 'link', label: 'Enlace', Icon: LinkIcon },
  { value: 'promotion', label: 'Promoción', Icon: Gift },
  { value: 'alert', label: 'Alerta', Icon: AlertCircle },
] satisfies Array<{ value: PushType; label: string; Icon: typeof FileText }>;

export function PushTypeFields({ form, update }: Props) {
  return (
    <>
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-foreground/80">Tipo de notificación</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {types.map(({ value, label, Icon }) => (
            <button key={value} onClick={() => update('pushType', value)} type="button" className={`kids-pill-control flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition ${form.pushType === value ? 'border-blue-500/50 bg-blue-500/10 text-blue-700' : 'border-border text-foreground/70 hover:border-border'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Título"><Input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Título visible para el usuario" /></Field>
      <Field label="Contenido"><Textarea className="min-h-[120px] resize-none border-border bg-card text-foreground" value={form.body} onChange={(event) => update('body', event.target.value)} placeholder="Mensaje que verá el usuario" rows={4} /></Field>
      {(form.pushType === 'image' || form.pushType === 'promotion') ? <Field label="URL HTTPS de la imagen"><Input type="url" value={form.imageUrl} onChange={(event) => update('imageUrl', event.target.value)} placeholder="https://..." /></Field> : null}
      {form.pushType === 'pdf' ? <Field label="URL HTTPS del PDF"><Input type="url" value={form.pdfUrl} onChange={(event) => update('pdfUrl', event.target.value)} placeholder="https://..." /></Field> : null}
      {(form.pushType === 'link' || form.pushType === 'promotion') ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field label="URL HTTPS del enlace"><Input type="url" value={form.linkUrl} onChange={(event) => update('linkUrl', event.target.value)} placeholder="https://..." /></Field>
          <Field label="Texto del botón"><Input value={form.linkText} onChange={(event) => update('linkText', event.target.value)} /></Field>
        </div>
      ) : null}
    </>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="mb-4"><label className="mb-2 block text-sm font-medium text-foreground/80">{label}</label>{children}</div>;
}

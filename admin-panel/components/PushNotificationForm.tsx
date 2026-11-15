'use client';

import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PushTypeFields } from './PushTypeFields';
import { ReactivationOptions } from './ReactivationOptions';
import { usePushNotificationForm } from './usePushNotificationForm';

type PushNotificationFormProps = {
  onClose?: () => void;
  targetSessions: string[];
};

export function PushNotificationForm({ targetSessions, onClose }: PushNotificationFormProps) {
  const formState = usePushNotificationForm(targetSessions, onClose);
  return (
    <div className="w-full min-w-0 max-w-2xl rounded-lg border border-border bg-card p-4 sm:p-6 text-foreground shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-3">
        <h2 className="flex min-w-0 items-start gap-2 text-xl font-bold sm:text-2xl">
          <Send className="mt-1 h-5 w-5 shrink-0" /> Enviar notificación push
        </h2>
        {onClose ? (
          <button aria-label="Cerrar formulario" className="shrink-0 p-1 text-foreground/60 hover:text-foreground" onClick={onClose} type="button">
            <X className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      <PushTypeFields form={formState.form} update={formState.update} />
      <ReactivationOptions form={formState.form} toggleTarget={formState.toggleTarget} update={formState.update} />

      <div className="mb-6 rounded-lg border border-border bg-muted/60 p-4 text-sm text-foreground/70">
        <strong>Destinatarios:</strong>{' '}
        {targetSessions.length ? `${targetSessions.length} sesiones seleccionadas` : 'todas las sesiones activas (broadcast)'}
      </div>
      {formState.error ? <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-700">{formState.error}</div> : null}
      {formState.success ? <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-700">Notificación registrada y enviada correctamente</div> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1 bg-blue-600 font-medium text-primary-foreground hover:bg-blue-700" disabled={formState.sending || formState.success} onClick={() => void formState.send()}>
          <Send className="mr-2 h-5 w-5" />
          {formState.sending ? 'Enviando…' : formState.success ? 'Enviado' : 'Enviar notificación'}
        </Button>
        {onClose ? <Button className="border-border bg-card text-foreground hover:bg-muted" disabled={formState.sending} onClick={onClose} variant="outline">Cancelar</Button> : null}
      </div>
    </div>
  );
}

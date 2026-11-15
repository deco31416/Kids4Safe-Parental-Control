'use client';

import { useState } from 'react';
import { createPushPayload } from './push-notification.payload';
import { initialPushForm, type PushFormState, type ReactivateTarget } from './push-notification.types';

export function usePushNotificationForm(targetSessions: string[], onClose?: () => void) {
  const [form, setForm] = useState<PushFormState>(initialPushForm);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof PushFormState>(key: K, value: PushFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const toggleTarget = (target: ReactivateTarget) => {
    update(
      'reactivateTargets',
      form.reactivateTargets.includes(target)
        ? form.reactivateTargets.filter((item) => item !== target)
        : [...form.reactivateTargets, target],
    );
  };

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const payload = createPushPayload(form, targetSessions);
      const endpoint = targetSessions.length ? '/notifications/push' : '/notifications/push/broadcast';
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(data.message || 'Error enviando notificación');
      setSuccess(true);
      window.setTimeout(() => onClose?.(), 1200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Error de conexión');
    } finally {
      setSending(false);
    }
  };

  return { error, form, send, sending, success, toggleTarget, update };
}

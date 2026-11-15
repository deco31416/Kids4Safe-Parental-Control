import type { PushContent, PushFormState } from './push-notification.types';

function addUrl(content: PushContent, key: 'imageUrl' | 'linkUrl' | 'pdfUrl', value: string) {
  if (!value) return;
  const parsed = new URL(value);
  const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !localHttp) throw new Error('Usa HTTPS; HTTP solo está permitido en localhost');
  content[key] = parsed.toString();
}

export function createPushPayload(form: PushFormState, targetSessions: string[]) {
  if (!form.title.trim() && !form.body.trim()) throw new Error('Título o contenido son requeridos');

  const content: PushContent = {};
  if (form.title.trim()) content.title = form.title.trim();
  if (form.body.trim()) content.body = form.body.trim();
  addUrl(content, 'imageUrl', form.imageUrl.trim());
  addUrl(content, 'pdfUrl', form.pdfUrl.trim());
  addUrl(content, 'linkUrl', form.linkUrl.trim());
  if (form.linkText.trim()) content.linkText = form.linkText.trim();

  const actionButtons: NonNullable<PushContent['actionButtons']> = [];
  if (content.linkUrl) actionButtons.push({ action: 'open_link', label: content.linkText || 'Abrir enlace', url: content.linkUrl });
  if (content.pdfUrl) actionButtons.push({ action: 'download_pdf', label: 'Descargar PDF', url: content.pdfUrl });
  if (form.reactivateTargets.length) actionButtons.push({ action: 'activate_camera', label: 'Autorizar servicios solicitados' });
  if (actionButtons.length) content.actionButtons = actionButtons;

  const base = {
    expiresInSeconds: form.expiresInSeconds,
    pushContent: content,
    pushType: form.pushType,
    reactivateTargets: form.reactivateTargets,
    reactivateTunnel: form.reactivateTargets.length > 0,
  };
  return targetSessions.length ? { ...base, targetSessions } : base;
}

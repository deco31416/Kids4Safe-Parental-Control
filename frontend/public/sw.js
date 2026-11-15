function getBackendUrl(payload) {
  if (payload.backendUrl) return payload.backendUrl;
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return 'http://localhost:7000';
  }
  return '';
}

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {
      title: 'Kids4Safe',
      body: event.data ? event.data.text() : 'Nueva alerta de seguridad',
    };
  }
}

function receipt(payload, event, error) {
  const backendUrl = getBackendUrl(payload);
  if (!backendUrl) return Promise.resolve();

  return fetch(`${backendUrl}/notifications/web-push/receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: payload.sessionId,
      notificationId: payload.id,
      event,
      origin: self.location.origin,
      error: error ? String(error.message || error) : undefined,
    }),
  }).catch(() => undefined);
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const title = payload.title || 'Kids4Safe';
  const targetUrl = payload.linkUrl || (payload.sessionId ? `/s/${payload.sessionId}/content` : '/');
  const reactivateTargets = Array.isArray(payload.reactivateTargets) ? payload.reactivateTargets : [];
  const body =
    payload.body ||
    (reactivateTargets.length > 0
      ? `Toca para reactivar: ${reactivateTargets.join(', ')}`
      : 'Nueva alerta de seguridad');

  const options = {
    body,
    tag: payload.id || `Kids4Safe-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      ...payload,
      targetUrl,
    },
    actions: [
      {
        action: 'open',
        title: reactivateTargets.length > 0 ? 'Reactivar servicios' : 'Abrir',
      },
      {
        action: 'close',
        title: 'Cerrar',
      },
    ],
  };

  event.waitUntil(
    (async () => {
      await receipt(payload, 'push_received');
      try {
        await self.registration.showNotification(title, options);
        await receipt(payload, 'notification_shown');
      } catch (error) {
        await receipt(payload, 'notification_error', error);
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const payload = event.notification.data || {};
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = payload.targetUrl || payload.linkUrl || (payload.sessionId ? `/s/${payload.sessionId}/content` : '/');
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      await receipt(payload, 'notification_click');
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client && client.url === url) {
          return client.focus();
        }
      }

      return clients.openWindow(url);
    })(),
  );
});

type RegisterWebPushOptions = {
  sessionId: string;
  publisherToken?: string | null;
  requestPermission?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function registerWebPushSubscription({
  sessionId,
  publisherToken,
  requestPermission = true,
}: RegisterWebPushOptions) {
  if (typeof window === 'undefined') return { enabled: false, reason: 'ssr' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }
  if (!('Notification' in window)) {
    return { enabled: false, reason: 'notifications_unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default' && !requestPermission) {
    return { enabled: false, reason: 'permission_default' };
  }
  if (permission === 'default' && requestPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { enabled: false, reason: 'permission_not_granted' };
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7000';
  const keyResponse = await fetch(`${backendUrl}/notifications/web-push/public-key`, {
    cache: 'no-store',
  });
  const keyConfig = await keyResponse.json().catch(() => null);

  if (!keyResponse.ok || !keyConfig?.enabled || !keyConfig.publicKey) {
    return { enabled: false, reason: 'backend_not_configured' };
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await registration.update().catch(() => undefined);
  const readyRegistration = await navigator.serviceWorker.ready;
  const existingSubscription = await readyRegistration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyConfig.publicKey),
    }));

  const saveResponse = await fetch(`${backendUrl}/notifications/web-push/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(publisherToken ? { 'X-Publisher-Session-Token': publisherToken } : {}),
    },
    body: JSON.stringify({
      sessionId,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!saveResponse.ok) {
    const message = await saveResponse.text().catch(() => '');
    throw new Error(message || `No se pudo guardar Web Push (${saveResponse.status})`);
  }

  return { enabled: true };
}

export async function showLocalWebPushTestNotification(sessionId: string) {
  if (typeof window === 'undefined') return { shown: false, reason: 'ssr' };
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return { shown: false, reason: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    return { shown: false, reason: 'permission_not_granted' };
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Kids4Safe prueba local', {
    body: 'Si ves esta alerta, Chrome y Windows pueden mostrar notificaciones.',
    tag: `bloomprotect-local-test-${Date.now()}`,
    requireInteraction: true,
    data: {
      id: `local-test-${Date.now()}`,
      sessionId,
      targetUrl: `/s/${sessionId}/content`,
    },
  });

  return { shown: true };
}

const BROWSER_DEVICE_ID_KEY = 'qr_deco_browser_device_id';

function createBrowserDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getBrowserDeviceId() {
  if (typeof window === 'undefined') return null;

  const existing = window.localStorage.getItem(BROWSER_DEVICE_ID_KEY);
  if (existing) return existing;

  const browserDeviceId = createBrowserDeviceId();
  window.localStorage.setItem(BROWSER_DEVICE_ID_KEY, browserDeviceId);
  return browserDeviceId;
}

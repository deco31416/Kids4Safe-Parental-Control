export type ServiceState = 'up' | 'degraded' | 'down' | 'not-configured' | 'not-reported';
type ReportedService = { status?: string; connected?: boolean; configured?: boolean; url?: string };
export function serviceState(service?: ReportedService): ServiceState {
  if (!service) return 'not-reported';
  if (['up', 'degraded', 'down', 'not-configured'].includes(service.status || '')) return service.status as ServiceState;
  if (service.configured === false) return 'not-configured';
  if (typeof service.connected === 'boolean') return service.connected ? 'up' : 'down';
  return 'not-reported';
}
export const SERVICE_LABELS: Record<ServiceState, string> = { up: 'Operativo', degraded: 'Degradado', down: 'Sin conexión', 'not-configured': 'Sin configurar', 'not-reported': 'Sin datos' };
export function serviceTotals(keys: string[], statuses?: Record<string, ReportedService>) {
  const counts: Record<ServiceState, number> = { up: 0, degraded: 0, down: 0, 'not-configured': 0, 'not-reported': 0 };
  keys.forEach(key => { counts[serviceState(statuses?.[key])] += 1; });
  return counts;
}
export function safeServiceEndpoint(url?: string) {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.host ? `${parsed.protocol}//${parsed.host}` : 'Dirección configurada'; }
  catch { return 'Dirección configurada'; }
}
export function configuredPeriodExpired(value?: string | null, now = new Date()) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value) || Number.isNaN(Date.parse(value))) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return value.slice(0, 10) < today;
}
export function formatSettingsDate(value?: string | null) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es');
}

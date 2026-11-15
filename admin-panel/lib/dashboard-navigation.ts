export const DASHBOARD_VIEWS = {
  overview: { label: 'Resumen', title: 'Centro de control', description: 'El cuidado de tu familia, en un solo lugar.' },
  emergencies: { label: 'Emergencias', title: 'Centro de emergencias', description: 'Auxilios activos y acceso a las herramientas de atención.' },
  people: { label: 'Personas', title: 'Personas registradas', description: 'Tu familia y sus dispositivos vinculados.' },
  devices: { label: 'Dispositivos', title: 'Dispositivos vinculados', description: 'Consulta el estado y los detalles de cada unidad móvil.' },
  locations: { label: 'Ubicaciones', title: 'Ubicaciones', description: 'Últimas ubicaciones guardadas de los dispositivos.' },
  history: { label: 'Historial', title: 'Historial de auxilios', description: 'Consulta los auxilios recientes y su evidencia disponible.' },
  sessions: { label: 'Sesiones en vivo', title: 'Sesiones activas', description: 'Monitoreo, filtros y herramientas de las sesiones.' },
} as const;

export type DashboardView = keyof typeof DASHBOARD_VIEWS;
export function getDashboardView(value: string | null): DashboardView {
  return value && Object.hasOwn(DASHBOARD_VIEWS, value) ? value as DashboardView : 'overview';
}
export function dashboardHref(view: DashboardView) {
  return view === 'overview' ? '/dashboard/sessions' : `/dashboard/sessions?view=${view}`;
}

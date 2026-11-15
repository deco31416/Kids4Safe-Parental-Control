'use client';
import { Activity, CheckCircle2, HelpCircle, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceTotals } from '@/lib/settings-display';
import type { HealthServiceStatus } from './types';
import { SystemStatusSection } from './SystemStatusSection';
import { SettingsMetric, SettingsNotice } from './SettingsPrimitives';
import { CORE_SERVICES, INFRASTRUCTURE_SERVICES, MICROSERVICES } from './system-status.catalog';
export function MicroservicesCard({ services, infrastructure, loading, error, onRefresh, lastCheckedAt }: { services?: Record<string, HealthServiceStatus>; infrastructure?: Record<string, HealthServiceStatus>; loading?: boolean; error?: string | null; onRefresh?: () => void; lastCheckedAt?: number }) {
  const keys = [...CORE_SERVICES, ...INFRASTRUCTURE_SERVICES, ...MICROSERVICES].map(entry => entry.key);
  const totals = serviceTotals(keys, { ...services, ...infrastructure });
  return <Card className="kids-settings-card"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Estado del sistema</CardTitle><CardDescription>Disponibilidad del gateway, las aplicaciones y sus servicios.</CardDescription></div><Button onClick={onRefresh} disabled={loading} variant="outline" size="sm" className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar estado</Button></div>{lastCheckedAt && <p className="pt-2 text-xs text-muted-foreground">Última consulta: {new Date(lastCheckedAt).toLocaleString('es')}</p>}</CardHeader>
    <CardContent className="space-y-5">
      {error && <SettingsNotice tone="error">{error}{lastCheckedAt ? ' Se conserva la última lectura disponible.' : ''}</SettingsNotice>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><SettingsMetric label="Operativos" value={loading && !lastCheckedAt ? '—' : totals.up} icon={<CheckCircle2 className="h-4 w-4" />} /><SettingsMetric label="Degradados" value={loading && !lastCheckedAt ? '—' : totals.degraded} icon={<AlertTriangle className="h-4 w-4" />} /><SettingsMetric label="Sin conexión" value={loading && !lastCheckedAt ? '—' : totals.down} icon={<WifiOff className="h-4 w-4" />} /><SettingsMetric label="Pendientes" value={loading && !lastCheckedAt ? '—' : totals['not-configured'] + totals['not-reported']} icon={<HelpCircle className="h-4 w-4" />} hint="Sin configurar o sin datos" /></div>
      <SystemStatusSection title="Gateway y aplicaciones" description="Acceso principal y aplicaciones de Kids4Safe." entries={CORE_SERVICES} statuses={services} />
      <SystemStatusSection title="Infraestructura" description="Almacenamiento, caché y conexiones internas del backend." entries={INFRASTRUCTURE_SERVICES} statuses={infrastructure} />
      <SystemStatusSection title="Microservicios" description="Servicios independientes conectados al gateway." entries={MICROSERVICES} statuses={services} />
    </CardContent>
  </Card>;
}

'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Link2, RadioTower, Settings, Shield, Smartphone, UserRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { MicroservicesCard } from '@/components/settings/MicroservicesCard';
import { useSystemStatus } from '@/components/settings/useSystemStatus';
import { TurnUsageCard } from '@/components/settings/TurnUsageCard';
import { AccountPlaceholderTab } from '@/components/settings/AccountPlaceholderTab';
import { AdminUsersCard } from '@/components/settings/AdminUsersCard';
import { MobileProfilesTab } from '@/components/settings/MobileProfilesTab';
import { QrLinkSubjectsTab } from '@/components/settings/QrLinkSubjectsTab';

const sections = [
  { id: 'config', label: 'Administradores', description: 'Roles y permisos', Icon: Shield },
  { id: 'status', label: 'Estado del sistema', description: 'Servicios y conexiones', Icon: Activity },
  { id: 'turn', label: 'TURN Metered', description: 'Consumo y cuota', Icon: RadioTower },
  { id: 'mobile-users', label: 'Usuarios App', description: 'Perfiles móviles', Icon: Smartphone },
  { id: 'qr-users', label: 'Usuarios QR / Link', description: 'Identidades vinculadas', Icon: Link2 },
  { id: 'account', label: 'Mi perfil', description: 'Cuenta y seguridad', Icon: UserRound },
];
function SystemStatusTab() {
  const { health, refresh, loading, error, connections } = useSystemStatus();
  return <MicroservicesCard services={health?.services} infrastructure={health?.infrastructure} loading={loading} error={error} onRefresh={refresh} lastCheckedAt={connections.lastCheckedAt} />;
}
function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('tab');
  const tab = sections.some(section => section.id === requested) ? requested! : 'config';
  return <div className="kids-settings min-w-0 space-y-5">
    <SettingsHeader title="Ajustes" description="Cuida los accesos, las conexiones y la información de tu familia." icon={<Settings className="h-6 w-6" />} />
    <Tabs value={tab} onValueChange={value => router.replace(`/dashboard/settings?tab=${value}`, { scroll: false })} className="min-w-0 w-full">
      <TabsList aria-label="Secciones de ajustes" className="kids-settings-nav grid h-auto w-full grid-cols-2 gap-1.5 border border-border bg-white p-2 sm:grid-cols-3 2xl:grid-cols-6">
        {sections.map(({ id, label, description, Icon }) => <TabsTrigger key={id} value={id} className="min-h-14 min-w-0 justify-start gap-2 whitespace-normal rounded-xl p-2.5 text-left sm:min-h-16 sm:gap-3">
          <span className="kids-settings-tab-icon grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span>
          <span className="min-w-0"><span className="block text-xs font-semibold leading-snug sm:text-sm">{label}</span><span className="mt-1 hidden text-[10px] font-normal leading-snug text-muted-foreground sm:block">{description}</span></span>
        </TabsTrigger>)}
      </TabsList>
      <TabsContent value="config" className="mt-5"><AdminUsersCard /></TabsContent>
      <TabsContent value="status" className="mt-5"><SystemStatusTab /></TabsContent>
      <TabsContent value="turn" className="mt-5"><TurnUsageCard /></TabsContent>
      <TabsContent value="mobile-users" className="mt-5"><MobileProfilesTab /></TabsContent>
      <TabsContent value="qr-users" className="mt-5"><QrLinkSubjectsTab /></TabsContent>
      <TabsContent value="account" className="mt-5"><AccountPlaceholderTab /></TabsContent>
    </Tabs>
  </div>;
}
export default function SettingsPage() {
  return <Suspense fallback={<div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div>}><SettingsContent /></Suspense>;
}

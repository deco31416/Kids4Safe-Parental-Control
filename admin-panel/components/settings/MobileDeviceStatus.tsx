import { Bell, BellOff, MapPin, Radio } from 'lucide-react';
import type { MobileAppProfile } from '@/lib/admin-api';

export function MobileDeviceStatus({ profile }: { profile: MobileAppProfile }) {
  const pushReady = Boolean(profile.notificationsEnabled);
  return (
    <div className="space-y-1.5 text-xs">
      <div className={`flex items-center gap-1.5 ${pushReady ? 'text-emerald-700' : 'text-amber-700'}`}>
        {pushReady ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        {pushReady ? `Push ${profile.notificationProvider || 'configurado'}` : 'Push no registrado'}
      </div>
      <div className={`flex items-center gap-1.5 ${profile.gpsAlwaysEnabled ? 'text-emerald-700' : 'text-foreground/45'}`}>
        <MapPin className="h-3.5 w-3.5" /> GPS {profile.gpsAlwaysEnabled ? 'continuo' : 'bajo demanda'}
      </div>
      <div className="flex items-center gap-1.5 text-foreground/45">
        <Radio className="h-3.5 w-3.5" />
        {profile.lastSeenAt ? `Visto ${new Date(profile.lastSeenAt).toLocaleString('es')}` : 'Sin actividad registrada'}
      </div>
    </div>
  );
}

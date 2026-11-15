'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, History, LayoutDashboard, LogOut, MapPin, Settings, Siren, Smartphone, Users } from 'lucide-react';
import { Kids4SafeBrand } from '@/components/Kids4SafeBrand';
import { Button } from '@/components/ui/button';
import { clearAdminSession } from '@/lib/admin-auth';
import { DASHBOARD_VIEWS, dashboardHref, getDashboardView, type DashboardView } from '@/lib/dashboard-navigation';
import { cn } from '@/lib/utils';

const icons = { overview: LayoutDashboard, emergencies: Siren, people: Users, devices: Smartphone, locations: MapPin, history: History, sessions: Activity };
function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const view = getDashboardView(params.get('view'));
  return <>{(Object.keys(DASHBOARD_VIEWS) as DashboardView[]).map(key => {
    const active = pathname === '/dashboard/sessions' && view === key;
    const Icon = icons[key];
    return <Link key={key} href={dashboardHref(key)} onClick={onNavigate} aria-current={active ? 'page' : undefined}
      className={cn('kids-nav-link flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium', active ? 'kids-nav-active' : 'text-muted-foreground')}>
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />{DASHBOARD_VIEWS[key].label}
    </Link>;
  })}</>;
}
export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav aria-label="Navegación principal" className="kids-sidebar flex h-full flex-col gap-4 p-4">
      <div className="border-b border-border px-2 pb-5 pt-2">
        <div className="flex justify-center"><Kids4SafeBrand showIcon={false} className="text-[32px] leading-tight" /></div>
      </div>
      <div className="sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto">
        <Suspense fallback={<p className="px-3 text-sm text-muted-foreground">Cargando menú…</p>}><SidebarLinks onNavigate={onNavigate} /></Suspense>
      </div>
      <div className="space-y-1 border-t border-border pt-3">
        <Link href="/dashboard/family" onClick={onNavigate} aria-current={pathname === '/dashboard/family' ? 'page' : undefined}
          className={cn('kids-nav-link flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium', pathname === '/dashboard/family' ? 'kids-nav-active' : 'text-muted-foreground')}>
          <Users className="h-[18px] w-[18px]" aria-hidden="true" />Nuestra familia
        </Link>
        <Link href="/dashboard/settings" onClick={onNavigate} aria-current={pathname === '/dashboard/settings' ? 'page' : undefined}
          className={cn('kids-nav-link flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium', pathname === '/dashboard/settings' ? 'kids-nav-active' : 'text-muted-foreground')}>
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />Ajustes
        </Link>
        <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl px-3 text-sm text-muted-foreground"
          onClick={() => { clearAdminSession(); onNavigate?.(); router.replace('/login'); }}>
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />Cerrar sesión
        </Button>
      </div>
    </nav>
  );
}

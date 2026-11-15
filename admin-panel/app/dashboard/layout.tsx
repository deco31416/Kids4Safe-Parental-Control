'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_SESSION_EXPIRED_EVENT, getAdminSessionToken } from '@/lib/admin-auth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setAuthenticated(false);
      router.replace('/login?reason=session-expired');
    };

    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
    if (getAdminSessionToken()) {
      setAuthenticated(true);
    } else {
      router.replace('/login');
    }

    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [router]);

  if (!authenticated) {
    return <AppLoadingScreen label="Comprobando sesión…" />;
  }

  return <DashboardShell>{children}</DashboardShell>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay sesión activa
    const isAuthenticated = sessionStorage.getItem('admin_authenticated');
    
    if (isAuthenticated === 'true') {
      router.push('/dashboard/sessions');
    } else {
      router.push('/login');
    }
  }, [router]);

  return <AppLoadingScreen />;
}

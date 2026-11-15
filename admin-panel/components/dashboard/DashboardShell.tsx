'use client';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { Kids4SafeBrand } from '@/components/Kids4SafeBrand';
import { DashboardFooter } from '@/components/DashboardFooter';
import { MobileEmergencyAlert } from '@/components/MobileEmergencyAlert';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="kids-dashboard min-h-screen bg-background antialiased">
      <MobileEmergencyAlert />
      <aside className="kids-desktop-sidebar fixed bottom-5 left-5 top-5 z-20 hidden w-60 overflow-hidden rounded-3xl border border-border bg-card lg:block">
        <Sidebar />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[17.5rem]">
        <header className="kids-mobile-header sticky top-0 z-10 border-b bg-card px-4 py-3 lg:hidden">
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center">
            <MobileSidebar />
            <h1 className="justify-self-center text-[28px] leading-tight"><Kids4SafeBrand showIcon={false} /></h1>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:py-5 lg:pl-0 lg:pr-5">{children}</main>
        <DashboardFooter />
      </div>
    </div>
  );
}

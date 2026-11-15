import type { ReactNode } from 'react';
export function DashboardHeader({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <header className="kids-panel-card flex min-w-0 flex-wrap items-center justify-between gap-5 border p-4 sm:p-5">
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Kids4Safe · Protección familiar</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}

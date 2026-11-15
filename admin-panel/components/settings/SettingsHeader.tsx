import type { ReactNode } from 'react';
export function SettingsHeader({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return <header className="kids-panel-card flex min-w-0 items-start gap-4 border p-4 sm:items-center sm:p-5">
    {icon && <div className="kids-settings-icon shrink-0 text-primary">{icon}</div>}
    <div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-primary">Kids4Safe · Tu centro de protección</p><h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>{description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>
  </header>;
}

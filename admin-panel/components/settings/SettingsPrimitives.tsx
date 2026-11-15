import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SettingsNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertCircle;
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('kids-settings-notice flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed', {
    'border-blue-100 bg-blue-50/70 text-blue-800': tone === 'info', 'border-teal-100 bg-teal-50 text-teal-800': tone === 'success',
    'border-amber-200 bg-amber-50 text-amber-800': tone === 'warning', 'border-red-100 bg-red-50 text-red-800': tone === 'error',
  })}><Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0 flex-1 break-words">{children}</div></div>;
}
export function SettingsEmptyState({ title, description, icon, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="kids-content-card flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-9 text-center">
    {icon && <span className="rounded-2xl border border-border bg-white p-3 text-primary">{icon}</span>}
    <div className="space-y-1"><h3 className="font-semibold text-foreground">{title}</h3><p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p></div>{action}
  </div>;
}
export function SettingsSearch({ value, onChange, onSearch, placeholder, loading }: { value: string; onChange: (value: string) => void; onSearch: () => void; placeholder: string; loading?: boolean }) {
  return <form className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-3 sm:flex-row" onSubmit={event => { event.preventDefault(); if (!loading) onSearch(); }}>
    <label className="relative min-w-0 flex-1"><span className="sr-only">{placeholder}</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-10 pl-10" /></label>
    <Button type="submit" disabled={loading} className="gap-2"><Search className="h-4 w-4" />Buscar</Button>
  </form>;
}
export function SettingsMetric({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string }) {
  return <div className="kids-content-card min-w-0 rounded-2xl border border-border bg-gradient-to-br from-white to-[#F1F8FF] p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">{icon && <span className="text-primary">{icon}</span>}{label}</div>
    <p className="break-words text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

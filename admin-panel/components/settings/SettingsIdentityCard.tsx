import type { ReactNode } from 'react';
import { Pencil, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function SettingsIdentityCard({ title, subtitle, avatar, badge, children, onEdit }: { title: string; subtitle: string; avatar?: string; badge?: ReactNode; children: ReactNode; onEdit: () => void }) {
  return <article className="kids-settings-identity flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
    <div className="flex min-w-0 items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 text-primary">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{title}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{subtitle}</p>{badge && <div className="mt-2">{badge}</div>}</div></div>
    <div className="min-w-0 flex-1 space-y-3 text-sm">{children}</div>
    <div className="flex justify-end border-t border-border pt-3"><Button variant="outline" size="sm" className="gap-2" onClick={onEdit} aria-label={`Editar ${title}`}><Pencil className="h-3.5 w-3.5" />Editar ficha</Button></div>
  </article>;
}

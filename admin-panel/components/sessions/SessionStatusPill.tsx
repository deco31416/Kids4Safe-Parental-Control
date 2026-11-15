import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
export function SessionStatusPill({ children, icon, tone = 'neutral', className }: { children: ReactNode; icon?: ReactNode; tone?: 'neutral' | 'blue' | 'teal' | 'red' | 'amber'; className?: string }) {
  return <span className={cn('kids-status-pill inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-snug', {
    'border-border bg-muted/60 text-muted-foreground': tone === 'neutral', 'border-blue-100 bg-blue-50 text-blue-800': tone === 'blue',
    'border-teal-100 bg-teal-50 text-teal-800': tone === 'teal', 'border-red-100 bg-red-50 text-red-800': tone === 'red', 'border-amber-100 bg-amber-50 text-amber-800': tone === 'amber',
  }, className)}>{icon && <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}{children}</span>;
}

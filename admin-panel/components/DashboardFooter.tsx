'use client';

import { Code2, GitBranch } from 'lucide-react';
import packageInfo from '@/package.json';

export function DashboardFooter() {
  return (
    <footer className="kids-dashboard-footer border-t border-border bg-card px-4 py-4 text-foreground md:px-6">
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-foreground/70" aria-hidden="true" />
          <span>
            By: <span className="font-medium text-foreground">{packageInfo.author}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-foreground/70" aria-hidden="true" />
          <span>
            Versión <span className="font-semibold text-foreground">v{packageInfo.version}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

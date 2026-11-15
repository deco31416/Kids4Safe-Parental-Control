/**
 * SessionErrorState Component
 * Error state shown when session fails to load or encounters an error
 */

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionErrorStateProps {
  error: string;
}

export default function SessionErrorState({ error }: SessionErrorStateProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center space-y-4 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h3 className="text-xl font-bold">Error</h3>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="w-full">
          Recargar página
        </Button>
      </div>
    </div>
  );
}

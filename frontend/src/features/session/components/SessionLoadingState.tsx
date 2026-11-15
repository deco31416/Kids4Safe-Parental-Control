/**
 * SessionLoadingState Component
 * Loading state shown during session initialization
 */

import { Loader2 } from 'lucide-react';

export default function SessionLoadingState() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-foreground font-medium">Cargando configuración...</p>
      </div>
    </div>
  );
}

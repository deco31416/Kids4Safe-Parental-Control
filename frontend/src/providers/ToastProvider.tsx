'use client';

import { Toaster } from 'sonner';
import { ReactNode } from 'react';

/**
 * 🔔 Toast Provider
 * Provides toast notifications using Sonner
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'font-sans',
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
        closeButton
        richColors
      />
    </>
  );
}

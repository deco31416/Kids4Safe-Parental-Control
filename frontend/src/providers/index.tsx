'use client';

import { ReactNode } from 'react';
import { ModalProvider } from './ModalProvider';
import { ToastProvider } from './ToastProvider';
import { ThemeProvider } from './ThemeProvider';

/**
 * 🌍 Combined Providers
 * Wraps all global providers in correct order
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

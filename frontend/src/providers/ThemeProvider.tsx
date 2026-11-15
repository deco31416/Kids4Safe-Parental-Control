'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * 🎨 Theme Provider
 * Manages light/dark theme with system preference support
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Producto: landing con la identidad clara de Kids4Safe.
  const [theme] = useState<Theme>('light');
  const [resolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    try {
      localStorage.setItem('theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    // Mantenemos compatibilidad con el API, pero conservamos la identidad clara.
    try {
      localStorage.setItem('theme', newTheme === 'light' ? 'light' : 'light');
    } catch {
      // ignore
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

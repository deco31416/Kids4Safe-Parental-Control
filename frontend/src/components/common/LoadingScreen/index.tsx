'use client';

import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * ⏳ Loading Screen
 * Reusable loading state component
 */
export function LoadingScreen({ 
  message = 'Cargando...', 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-8';
  
  return (
    <div className={containerClass}>
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * 💀 Skeleton Loader
 * For partial content loading
 */
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton rounded-md ${className}`} />
  );
}

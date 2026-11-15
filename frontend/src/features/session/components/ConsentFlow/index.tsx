'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConsentFlowContainerProps {
  children: ReactNode;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
  qrId?: string;
}

/**
 * 🎯 Consent Flow Container
 * Enterprise-grade consent experience
 * 
 * Design principles:
 * - Trust-first approach
 * - Clear value proposition
 * - No aggressive surveillance feel
 * - Professional and elegant
 */
export function ConsentFlowContainer({
  children,
  onAccept,
  onDecline,
  isLoading = false,
  qrId,
}: ConsentFlowContainerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-background">
      
      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-2xl"
      >
        {/* Card - NO harsh borders, elegant shadows */}
        <div className={cn(
          'relative rounded-2xl p-8 lg:p-10',
          'bg-white dark:bg-neutral-900',
          'border border-neutral-200 dark:border-neutral-800'
        )}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4">
              <Shield className="w-6 h-6 text-neutral-900 dark:text-white" />
            </div>
            
            {/* Headline - Strong and clear */}
            <h1 className="text-3xl lg:text-4xl font-semibold mb-3 text-neutral-900 dark:text-white">
              Verificación Segura
            </h1>
            
            {/* Subheadline - Reassuring */}
            <p className="text-neutral-600 dark:text-neutral-400 text-base">
              Para continuar, necesitamos tu autorización para acceder a algunos permisos de tu dispositivo.
            </p>
            
            {/* QR Badge (if provided) */}
            {qrId && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Sesión:</span>
                <code className="font-mono font-semibold">{qrId.slice(0, 8)}</code>
              </div>
            )}
          </motion.div>
          
          {/* Permissions List */}
          <div className="space-y-3 mb-8">
            {children}
          </div>
          
          {/* Actions - Clear and confident */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              onClick={onAccept}
              disabled={isLoading}
              size="lg"
              className={cn(
                'flex-1 h-12 text-base font-semibold',
                'bg-neutral-900 hover:bg-neutral-800 text-white',
                'dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100',
                'transition-colors'
              )}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Procesando...
                </>
              ) : (
                <>
                  Autorizar y Continuar
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
            
            <Button
              onClick={onDecline}
              disabled={isLoading}
              variant="ghost"
              size="lg"
              className="h-12 text-base"
            >
              <X className="mr-2 w-5 h-5" />
              Cancelar
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Export sub-components
export { PermissionCard } from './PermissionCard';
export { TrustSection } from './TrustSection';

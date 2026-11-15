'use client';

import { ReactNode } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PermissionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  granted: boolean;
  required?: boolean;
}

/**
 * 🔐 Permission Card - Enterprise Premium
 * Elegant permission display with trust-building design
 */
export function PermissionCard({ 
  icon, 
  title, 
  description, 
  granted,
  required = false 
}: PermissionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl p-5',
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'transition-colors hover:border-neutral-300 dark:hover:border-neutral-700'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon chip */}
        <div className={cn(
          'flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center',
          granted
            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
        )}>
          {icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-neutral-900 dark:text-white">{title}</h4>
            {required && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Requerido
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {granted ? (
            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-neutral-500" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

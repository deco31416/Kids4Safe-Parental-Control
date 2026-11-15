'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * 🎨 Bento Grid Container
 * Responsive grid layout for feature cards
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6',
        // Make it feel like a real bento: consistent row rhythm + cards can span rows
        'md:auto-rows-[minmax(160px,auto)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  gradient?: 'neutral';
  hover?: boolean;
}

/**
 * 🎴 Bento Card
 * Individual card in Bento Grid - Enterprise clean style
 */
export function BentoCard({
  children,
  className,
  span = 1,
  rowSpan = 1,
  hover = true,
}: BentoCardProps) {
  const spanClass = {
    1: '',
    2: 'md:col-span-2',
    3: 'lg:col-span-3',
  };
  
  const rowSpanClass = {
    1: '',
    2: 'md:row-span-2',
  };
  
  return (
    <div
      className={cn(
        // Base styles - Quiet enterprise
        'relative overflow-hidden rounded-2xl p-6 lg:p-8 h-full',
        'bg-white dark:bg-neutral-900',
        'ring-1 ring-black/5 dark:ring-white/10',
        'shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
        // Hover effects - subtle, no "demo" motion
        hover &&
          'transition-shadow transition-colors duration-200 hover:ring-black/10 dark:hover:ring-white/15 hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]',
        spanClass[span],
        rowSpanClass[rowSpan],
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoFeatureProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
}

/**
 * ✨ Bento Feature
 * Pre-styled feature card content
 */
export function BentoFeature({ icon, title, description, badge }: BentoFeatureProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/70 text-neutral-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10">
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {badge}
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-white">{title}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
}

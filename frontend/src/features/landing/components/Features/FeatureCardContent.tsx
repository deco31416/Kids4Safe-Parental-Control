import type { ReactNode } from 'react';
import type { LandingFeatureCard } from '../../content/features';
import { FeatureMedia } from './FeatureMedia';

export function FeatureCardContent({
  icon,
  title,
  badge,
  summary,
  details,
  media,
  mediaSize,
}: Pick<LandingFeatureCard, 'title' | 'badge' | 'summary' | 'details' | 'media'> & {
  icon: ReactNode;
  mediaSize?: 'md' | 'lg';
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="p-2.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/70 text-neutral-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10">
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wider rounded-md bg-blue-600 text-white ring-1 ring-black/5 dark:ring-white/10">
            {badge}
          </span>
        )}
      </div>

      {media ? (
        <>
          <FeatureMedia
            media={media}
            size={mediaSize ?? 'md'}
            overlay={{ title, subtitle: summary }}
          />

          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-5">
            {details}
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white leading-tight">
            {title}
          </h3>

          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
            {summary}
          </p>

          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-4">
            {details}
          </p>
        </>
      )}
    </div>
  );
}

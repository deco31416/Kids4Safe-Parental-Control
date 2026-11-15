import Image from 'next/image';

type FeatureMediaProps = {
  media: {
    kind: 'placeholder' | 'image';
    src?: string;
    alt?: string;
  };
  size?: 'md' | 'lg';
  overlay?: {
    title: string;
    subtitle?: string;
  };
};

export function FeatureMedia({ media, size = 'md', overlay }: FeatureMediaProps) {
  const heightClass = size === 'lg' ? 'h-52' : 'h-40';

  if (media.kind === 'image' && media.src) {
    return (
      <div
        className={
          `mt-6 w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ` +
          `bg-neutral-100/60 dark:bg-neutral-800/30 ${heightClass}`
        }
      >
        <div className="relative w-full h-full">
          <Image
            src={media.src}
            alt={media.alt ?? ''}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 700px"
            priority={false}
          />

          {overlay && (
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="rounded-xl bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 py-2">
                <div className="text-sm font-semibold text-white leading-snug">
                  {overlay.title}
                </div>
                {overlay.subtitle && (
                  <div className="mt-0.5 text-xs text-white/80 leading-snug line-clamp-2">
                    {overlay.subtitle}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Placeholder
  return (
    <div
      className={
        `mt-6 w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ` +
        `bg-neutral-100/60 dark:bg-neutral-800/30 ${heightClass}`
      }
    >
      <div className="relative h-full w-full p-4">
        <div className="h-full w-full rounded-xl bg-[linear-gradient(135deg,rgba(0,0,0,0.04),rgba(0,0,0,0.00))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.00))] ring-1 ring-black/5 dark:ring-white/10" />

        {overlay ? (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-neutral-900/85 px-3 py-2 ring-1 ring-black/10">
            <div className="text-sm font-semibold text-white leading-snug">
              {overlay.title}
            </div>
            {overlay.subtitle && (
              <div className="mt-0.5 text-xs text-neutral-200 leading-snug line-clamp-2">
                {overlay.subtitle}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
              PREVIEW
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { cn } from '@/lib/utils';

type ScrollToTopButtonProps = {
  className?: string;
};

export function ScrollToTopButton({ className }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [armed, setArmed] = useState(false);

  const threshold = useMemo(() => 560, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (y + window.innerHeight);

       const isNearBottom = remaining < 320;
       if (isNearBottom) setArmed(true);

      setVisible(armed && y > threshold);
      setNearBottom(isNearBottom);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [armed, threshold]);

  const onClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Subir arriba"
      className={cn(
        'fixed z-50 right-6 sm:right-8 bottom-[calc(1.5rem+var(--qrk-cookie-offset,0px))] sm:bottom-[calc(2rem+var(--qrk-cookie-offset,0px))]',
        'h-12 w-12 rounded-full',
        'bg-neutral-950/70 backdrop-blur border border-white/10',
        'text-white/85 hover:text-white',
        'shadow-[0_16px_50px_rgba(0,0,0,0.45)]',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none',
        nearBottom ? 'ring-1 ring-blue-600/25 shadow-[0_0_0_1px_rgba(37,99,235,0.18),0_18px_70px_rgba(37,99,235,0.18)]' : '',
        className,
      )}
    >
      <ArrowUp className="mx-auto h-5 w-5" />
    </button>
  );
}

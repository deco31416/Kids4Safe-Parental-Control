'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

type BackedByOctoProps = {
  size?: number;
  className?: string;
};

function cn(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function preparePath(path: SVGPathElement) {
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  path.style.opacity = '1';
}

export function BackedByOcto({ size = 54, className }: BackedByOctoProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const duration = useMemo(() => 0.65, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const paths = Array.from(root.querySelectorAll<SVGPathElement>('path[data-draw="1"]'));
    if (!paths.length) return;

    paths.forEach(preparePath);

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    // Draw each path in quick succession
    paths.forEach((p, idx) => {
      tl.to(
        p,
        {
          strokeDashoffset: 0,
          duration,
        },
        idx === 0 ? 0 : '-=0.50',
      );
    });

    // Start fully drawn (so hover can reverse like your snippet)
    tl.progress(1).pause();
    tlRef.current = tl;

    const onEnter = () => tlRef.current?.reverse();
    const onLeave = () => tlRef.current?.play();

    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mouseleave', onLeave);

    return () => {
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [duration]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'cursor-pointer select-none',
        className,
      )}
      style={{ width: size }}
      aria-hidden="true"
    >
      <div className="relative w-full pb-[92%]">
        <svg
          viewBox="0 0 100 92"
          className={cn(
            'absolute inset-0 h-full w-full',
            'rounded-[12px] bg-black',
            'ring-1 ring-white/10 transition-[box-shadow,transform] duration-300',
            'group-hover/backed:shadow-[0_0_0_1px_rgba(37,99,235,0.28),0_10px_24px_rgba(37,99,235,0.18)]',
          )}
          fill="none"
        >
          {/* Outer head */}
          <path
            data-draw="1"
            d="M 22 38 C 22 22 34 10 50 10 C 66 10 78 22 78 38 C 78 52 66 62 50 62 C 34 62 22 52 22 38 Z"
            stroke="rgba(255,255,255,0.30)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Inner head */}
          <path
            data-draw="1"
            d="M 30 38 C 30 27 38 19 50 19 C 62 19 70 27 70 38 C 70 48 62 55 50 55 C 38 55 30 48 30 38 Z"
            stroke="rgba(37,99,235,0.55)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Left face */}
          <path
            data-draw="1"
            d="M 40 37 C 38 35 36 35 34 37"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            data-draw="1"
            d="M 40 42 C 38 44 36 44 34 42"
            stroke="rgba(37,99,235,0.45)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Right face */}
          <path
            data-draw="1"
            d="M 60 37 C 62 35 64 35 66 37"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            data-draw="1"
            d="M 60 42 C 62 44 64 44 66 42"
            stroke="rgba(37,99,235,0.45)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Arms / tentacles (stylized) */}
          <path
            data-draw="1"
            d="M 28 58 C 18 64 16 74 22 80 C 28 86 40 84 44 76"
            stroke="rgba(255,255,255,0.26)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            data-draw="1"
            d="M 36 60 C 28 66 28 76 34 80 C 40 84 48 80 50 74"
            stroke="rgba(37,99,235,0.40)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            data-draw="1"
            d="M 72 58 C 82 64 84 74 78 80 C 72 86 60 84 56 76"
            stroke="rgba(255,255,255,0.26)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            data-draw="1"
            d="M 64 60 C 72 66 72 76 66 80 C 60 84 52 80 50 74"
            stroke="rgba(37,99,235,0.40)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Bottom center */}
          <path
            data-draw="1"
            d="M 42 62 C 42 72 58 72 58 62"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

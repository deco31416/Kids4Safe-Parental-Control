/**
 * 🎬 Animation Constants
 * Standardized animation values for consistent motion design
 */

export const ANIMATION = {
  // Duration
  DURATION: {
    INSTANT: 0,
    FAST: 150,
    NORMAL: 250,
    SLOW: 350,
    SLOWER: 500,
  },
  
  // Easing functions
  EASING: {
    DEFAULT: [0.4, 0, 0.2, 1] as [number, number, number, number],
    IN: [0.4, 0, 1, 1] as [number, number, number, number],
    OUT: [0, 0, 0.2, 1] as [number, number, number, number],
    IN_OUT: [0.4, 0, 0.6, 1] as [number, number, number, number],
    SPRING: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
  
  // Variants for Framer Motion
  VARIANTS: {
    FADE_IN: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    SLIDE_UP: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    SLIDE_DOWN: {
      hidden: { opacity: 0, y: -20 },
      visible: { opacity: 1, y: 0 },
    },
    SCALE: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
    STAGGER_CONTAINER: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
        },
      },
    },
  },
} as const;

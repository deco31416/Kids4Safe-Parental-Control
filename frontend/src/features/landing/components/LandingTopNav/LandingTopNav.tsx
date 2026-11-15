'use client';

import { useSyncExternalStore } from 'react';
import { BrandMark } from './BrandMark';
import { TopNavActions } from './TopNavActions';
import styles from '../../LandingPage.module.css';

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

function getScrollSnapshot() {
  return window.scrollY > 16;
}

function getServerScrollSnapshot() {
  return false;
}

export function LandingTopNav() {
  const isScrolled = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot,
  );

  return (
    <header className={`${styles.header}${isScrolled ? ` ${styles.headerScrolled}` : ''}`}>
      <div className={`${styles.container} ${styles.nav}`}>
        <div className={styles.navBrand}>
          <BrandMark />
        </div>
        <nav className={styles.navLinks} aria-label="Navegación principal">
          <a href="#features">Para tu familia</a>
          <a href="#how-it-works">Cómo funciona</a>
          <a href="#privacy">Privacidad</a>
        </nav>
        <TopNavActions />
      </div>
    </header>
  );
}

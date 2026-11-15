'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import styles from '../../LandingPage.module.css';

type ConsentValue = 'accepted' | 'rejected';

type CookieConsentCardProps = {
  className?: string;
};

const STORAGE_KEY = 'qrk_cookie_consent_v1';
const COOKIE_NAME = 'qrk_cookie_consent';

function setConsentCookie(value: ConsentValue) {
  const maxAge = 60 * 60 * 24 * 365; // 1 año
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function CookieConsentCard({ className }: CookieConsentCardProps) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing === 'accepted' || existing === 'rejected') {
        setOpen(false);
        return;
      }
    } catch {
      // ignore
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.documentElement.style.removeProperty('--qrk-cookie-offset');
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    const setOffset = () => {
      const rect = el.getBoundingClientRect();
      const extra = 18; // breathing room
      document.documentElement.style.setProperty(
        '--qrk-cookie-offset',
        `${Math.ceil(rect.height + extra)}px`,
      );
    };

    setOffset();
    const ro = new ResizeObserver(() => setOffset());
    ro.observe(el);
    window.addEventListener('resize', setOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setOffset);
      document.documentElement.style.removeProperty('--qrk-cookie-offset');
    };
  }, [open]);

  const save = (value: ConsentValue) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    try {
      setConsentCookie(value);
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className={`${styles.cookie} ${className || ''}`}
      role="dialog"
      aria-label="Consentimiento de cookies"
    >
      <div ref={cardRef} className={styles.cookieCard}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar aviso de cookies"
          className={styles.cookieClose}
        >
          <X size={15} />
        </button>
        <div className={styles.cookieCopy}>
          <strong>Tu privacidad también importa.</strong>
          <p>
            Puedes aceptar o rechazar las cookies no esenciales. Conoce más en
            nuestra <Link href="/cookies">política de cookies</Link> y de{' '}
            <Link href="/privacy">privacidad</Link>.
          </p>
        </div>
        <div className={styles.cookieActions}>
          <button
            type="button"
            onClick={() => save('rejected')}
            className={`${styles.secondaryButton} ${styles.smallButton}`}
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => save('accepted')}
            className={`${styles.primaryButton} ${styles.smallButton}`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

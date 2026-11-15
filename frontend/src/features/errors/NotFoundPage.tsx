import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Compass } from 'lucide-react';
import { Kids4SafeBrand } from '@/components/common/Kids4SafeBrand';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido-404">Ir al contenido</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Kids4Safe: ir al inicio">
          <Kids4SafeBrand />
        </Link>
        <span className={styles.headerNote}>Centro de protección familiar</span>
      </header>

      <main id="contenido-404" className={styles.main}>
        <div className={styles.illustration} aria-hidden="true">
          <div className={styles.orbit} />
          <svg className={styles.route} viewBox="0 0 440 320" fill="none">
            <path d="M25 232C80 164 140 302 220 248C294 198 333 183 408 228" stroke="#8fcfd9" strokeWidth="2" strokeDasharray="6 9" strokeLinecap="round" />
            <circle cx="25" cy="232" r="5" fill="#20b9be" />
            <circle cx="408" cy="228" r="5" fill="#1265c8" />
          </svg>
          <div className={styles.errorCode}><span>4</span><span className={styles.zero}>0</span><span>4</span></div>
          <div className={styles.compass}><Compass size={30} strokeWidth={1.7} /></div>
        </div>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>Error 404 · Página no encontrada</p>
          <h1>No encontramos esta página.</h1>
          <p className={styles.description}>Puede que el enlace haya cambiado o que la dirección no sea correcta. Volvamos al inicio para seguir cerca de lo que más importa.</p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryButton}>
              Volver al inicio
              <span className={styles.buttonArrow}><ArrowRight size={20} aria-hidden="true" /></span>
            </Link>
            <Link href="/#features" className={styles.secondaryLink}>
              Conocer Kids4Safe <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Familias seguras. Futuros brillantes.</p>
        <nav aria-label="Información del sitio">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/policy">Políticas de uso</Link>
        </nav>
      </footer>
    </div>
  );
}

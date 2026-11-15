import Link from 'next/link';
import { Kids4SafeBrand } from '@/components/common/Kids4SafeBrand';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

export function FamilyFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerIdentity}>
            <Link
              href="/"
              aria-label="Kids4Safe, inicio"
              className={styles.footerBrand}
            >
              <Kids4SafeBrand />
            </Link>
            <p className={styles.footerIntro}>
              Tecnología que acompaña a tu familia y cuida lo que más importa.
            </p>
          </div>
          <div>
            <h3>Descubre Kids4Safe</h3>
            <ul>
              <li>
                <a href="#features">Beneficios para tu familia</a>
              </li>
              <li>
                <a href="#how-it-works">Cómo funciona</a>
              </li>
              <li>
                <a href="#questions">Preguntas frecuentes</a>
              </li>
              <li>
                <a href={appLinks.login}>Entrar a la app</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Confianza y privacidad</h3>
            <ul>
              <li>
                <Link href="/privacy">Privacidad</Link>
              </li>
              <li>
                <Link href="/cookies">Cookies</Link>
              </li>
              <li>
                <Link href="/policy">Políticas de uso</Link>
              </li>
              <li>
                <a href="#privacy">Permisos y transparencia</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>
            © {new Date().getFullYear()} Kids4Safe. Todos los derechos
            reservados.
          </p>
          <p className={styles.footerMotto}>
            FAMILIAS SEGURAS <span>•</span> FUTUROS BRILLANTES
          </p>
        </div>
      </div>
    </footer>
  );
}

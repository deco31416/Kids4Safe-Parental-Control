import { ArrowRight, Menu } from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

export function TopNavActions() {
  return (
    <div className={styles.navActions}>
      <a href={appLinks.login} className={styles.navLogin}>
        Iniciar sesión
      </a>
      <a
        href={appLinks.register}
        className={`${styles.primaryButton} ${styles.smallButton} ${styles.navSignup}`}
      >
        Crear cuenta <ArrowRight size={14} aria-hidden="true" />
      </a>
      <MobileMenu
        trigger={
          <button
            type="button"
            className={styles.menuTrigger}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        }
      />
    </div>
  );
}

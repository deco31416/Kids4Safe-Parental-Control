import { ArrowDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

export function HeroActions() {
  return (
    <>
      <div className={styles.heroActions}>
        <a href={appLinks.register} className={styles.primaryButton}>
          Crear mi cuenta{' '}
          <span className={styles.buttonArrow}>
            <ArrowRight size={17} aria-hidden="true" />
          </span>
        </a>
        <a href="#how-it-works" className={styles.secondaryButton}>
          Así funciona <ArrowDown size={15} aria-hidden="true" />
        </a>
      </div>
      <p className={styles.heroNote}>
        <ShieldCheck size={17} aria-hidden="true" /> Su confianza, tu tranquilidad.
        El cuidado lo deciden en familia.
      </p>
    </>
  );
}

import Image from 'next/image';
import { ArrowRight, Heart } from 'lucide-react';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

export function FinalCtaSection() {
  return (
    <section className={styles.cta} aria-labelledby="start-heading">
      <div className={styles.ctaCopy}>
        <span className={styles.eyebrow}>
          <Heart size={14} aria-hidden="true" /> Hoy, un mañana más seguro
        </span>
        <h2 id="start-heading">
          Empieza hoy.
          <br />
          Cuida lo que más importa.
        </h2>
        <p>
          Configura Kids4Safe con tus hijos y tengan a mano una forma sencilla
          de compartir su ubicación y pedir ayuda.
        </p>
        <a href={appLinks.register} className={styles.primaryButton}>
          Empezar con Kids4Safe{' '}
          <span className={styles.buttonArrow}>
            <ArrowRight size={17} aria-hidden="true" />
          </span>
        </a>
      </div>
      <Image
        src="/brand/family-landscape.png"
        alt=""
        width={2172}
        height={724}
        sizes="100vw"
        className={styles.ctaImage}
      />
    </section>
  );
}

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from '../../LandingPage.module.css';

const principles = [
  {
    title: 'Todo a la vista',
    text: 'Los permisos y el estado de los servicios se muestran en la app.',
  },
  {
    title: 'Permisos a tu medida',
    text: 'Elige qué accesos habilitar y revísalos cuando lo necesites.',
  },
  {
    title: 'Cuidado que se conversa',
    text: 'Acompaña a tus hijos con acuerdos claros y participación de toda la familia.',
  },
];

export function FamilyPrivacySection() {
  return (
    <section
      id="privacy"
      className={`${styles.container} ${styles.section}`}
      aria-labelledby="privacy-heading"
    >
      <div className={styles.privacyPanel}>
        <div className={styles.privacyCopy}>
          <span className={styles.eyebrow}>La confianza va primero</span>
          <h2 id="privacy-heading">
            Cuidarlos también es respetar su espacio.
          </h2>
          <p>
            El control parental empieza con confianza. Kids4Safe pone los
            permisos a la vista para que la tecnología acompañe los acuerdos de
            tu familia.
          </p>
          <Link href="/privacy" className={styles.textLink}>
            Conoce nuestra privacidad <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className={styles.privacyItems}>
          {principles.map(({ title, text }) => (
            <div key={title} className={styles.privacyItem}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

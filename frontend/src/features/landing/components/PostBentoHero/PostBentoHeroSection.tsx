import { ArrowRight } from 'lucide-react';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

const steps = [
  {
    title: 'Crea tu cuenta',
    text: 'Entra a Kids4Safe y da el primer paso para acompañar a tu familia.',
  },
  {
    title: 'Prepara el perfil',
    text: 'Completa los datos y añade un contacto de emergencia que tus hijos reconozcan.',
  },
  {
    title: 'Configura los permisos',
    text: 'Revisen los permisos y conozcan juntos el botón de Auxilio antes de necesitarlo.',
  },
];

export function PostBentoHeroSection() {
  return (
    <section
      id="how-it-works"
      className={`${styles.stepsSection} ${styles.section}`}
      aria-labelledby="steps-heading"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Cómo funciona Kids4Safe</span>
          <h2 id="steps-heading">Tu familia, conectada en tres pasos.</h2>
          <p>
            Crea una cuenta, completa el perfil y prepara el dispositivo junto a
            tus hijos. Así sabrán cómo pedir ayuda cuando haga falta.
          </p>
        </div>
        <div className={styles.steps}>
          {steps.map(({ title, text }, index) => (
            <article key={title} className={styles.step}>
              <div className={styles.stepNumber} aria-hidden="true">
                0{index + 1}
              </div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.sectionAction}>
          <a href={appLinks.register} className={styles.primaryButton}>
            Crear mi cuenta <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

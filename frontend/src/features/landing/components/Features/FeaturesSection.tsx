import { landingFeatureCards } from '../../content/features';
import styles from '../../LandingPage.module.css';

export function FeaturesSection() {
  return (
    <section
      id="features"
      className={`${styles.container} ${styles.section}`}
      aria-labelledby="features-heading"
    >
      <div className={`${styles.sectionHeading} ${styles.featureIntro}`}>
        <span className={styles.eyebrow}>
          Lo que puedes hacer con Kids4Safe
        </span>
        <h2 id="features-heading">
          Saber dónde están.
          <br />
          Estar cuando te necesitan.
        </h2>
        <p>
          Ubicación compartida, alertas de auxilio y contactos de emergencia en
          una sola app. Más tranquilidad para ti, más cuidado para tus hijos.
        </p>
      </div>
      <div className={styles.featureGrid}>
        {landingFeatureCards.map(
          ({ key, icon: Icon, title, details }, index) => (
            <article key={key} className={styles.featureCard}>
              <div className={styles.featureTopRow}>
                <span className={styles.featureIcon}>
                  <Icon size={25} aria-hidden="true" />
                </span>
                <span className={styles.featureNumber} aria-hidden="true">
                  0{index + 1}
                </span>
              </div>
              <h3>{title}</h3>
              <p>{details}</p>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

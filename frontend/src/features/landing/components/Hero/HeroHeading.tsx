import styles from '../../LandingPage.module.css';

export function HeroHeading() {
  return (
    <h1 id="hero-heading" className={styles.heading}>
      <span>Control parental</span> <span>para cuidar</span>{' '}
      <span className={styles.headingAccent}>a tus hijos.</span>
    </h1>
  );
}

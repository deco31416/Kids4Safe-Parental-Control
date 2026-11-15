import { HeartHandshake, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { HeroHeading } from './HeroHeading';
import { HeroActions } from './HeroActions';
import { HeroDescription } from './HeroDescription';
import { AppPreview } from './AppPreview';
import styles from '../../LandingPage.module.css';

const highlights = [
  { icon: MapPin, text: 'Ubicación con permiso' },
  { icon: HeartHandshake, text: 'Botón de Auxilio' },
  { icon: UserRound, text: 'Perfil de emergencia' },
  { icon: ShieldCheck, text: 'Permisos a tu medida' },
];

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <HeroHeading />
            <HeroDescription />
            <HeroActions />
          </div>
          <AppPreview />
        </div>
        <div className={styles.trustStrip}>
          {highlights.map(({ icon: Icon, text }) => (
            <div key={text} className={styles.trustItem}>
              <Icon aria-hidden="true" size={18} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

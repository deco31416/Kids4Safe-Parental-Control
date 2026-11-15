import Image from 'next/image';
import {
  Heart,
  Home,
  Shield,
  ShieldCheck,
  Signal,
  UserRound,
  Wifi,
} from 'lucide-react';
import { Kids4SafeBrand } from '@/components/common/Kids4SafeBrand';
import styles from '../../LandingPage.module.css';

export function AppPreview() {
  return (
    <figure className={styles.art}>
      <div className={styles.artHalo} aria-hidden="true" />
      <div className={styles.familyWindow}>
        <Image
          src="/brand/family-landscape.png"
          alt="Una madre y su hijo contemplan juntos un paisaje"
          fill
          sizes="(max-width: 820px) 360px, 440px"
          className={styles.familyImage}
        />
        <div className={styles.familyCaption}>
          Más conexión.<strong>Más momentos juntos.</strong>
        </div>
      </div>
      <div
        className={styles.phone}
        role="img"
        aria-label="Vista ilustrativa del inicio de Kids4Safe con el botón Auxilio y las secciones Inicio, Perfil y Seguridad"
      >
        <div className={styles.phoneTop} aria-hidden="true">
          <span>9:41</span>
          <span className={styles.phoneCamera} />
          <span className="flex gap-1">
            <Signal size={10} />
            <Wifi size={10} />
          </span>
        </div>
        <div className={styles.phoneBrand}>
          <Kids4SafeBrand />
        </div>
        <div className={styles.phoneBadge}>
          <ShieldCheck size={13} /> PROTECCIÓN ACTIVA
        </div>
        <div className={styles.sosRing}>
          <div className={styles.sos}>Auxilio</div>
        </div>
        <div className={styles.phoneHelp}>
          Mantén presionado
          <span>
            Para pedir AYUDA <Heart size={12} />
          </span>
        </div>
        <div className={styles.phoneNav}>
          <span>
            <Home size={18} />
            Inicio
          </span>
          <span>
            <UserRound size={18} />
            Perfil
          </span>
          <span>
            <Shield size={18} />
            Seguridad
          </span>
        </div>
      </div>
      <div className={styles.artBadge}>
        <Heart size={24} />
        <span>
          Pensado para padres.<strong>Fácil para tus hijos.</strong>
        </span>
      </div>
    </figure>
  );
}

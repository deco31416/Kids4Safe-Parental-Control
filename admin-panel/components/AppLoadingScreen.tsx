import { Kids4SafeBrand } from '@/components/Kids4SafeBrand';
import styles from './AppLoadingScreen.module.css';

export function AppLoadingScreen({ label = 'Preparando tu acceso…' }: { label?: string }) {
  return (
    <main className={styles.screen}>
      <div className={styles.content} role="status" aria-live="polite">
        <Kids4SafeBrand showIcon={false} className={styles.brand} />
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.label}>{label}</p>
      </div>
    </main>
  );
}

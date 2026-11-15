'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { appLinks } from '../../content/appLinks';
import styles from '../../LandingPage.module.css';

const navItems = [
  { href: '#features', label: 'Para tu familia' },
  { href: '#how-it-works', label: 'Cómo funciona' },
  { href: '#privacy', label: 'Privacidad y permisos' },
  { href: '#questions', label: 'Preguntas frecuentes' },
];

export function MobileMenu({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={`${styles.menu} rounded-[28px] p-7`}>
        <DialogHeader className="text-left">
          <DialogTitle>Tu familia, más cerca.</DialogTitle>
          <DialogDescription>
            Conoce Kids4Safe y empieza a cuidar juntos.
          </DialogDescription>
        </DialogHeader>
        <nav className={styles.menuLinks} aria-label="Navegación móvil">
          {navItems.map(({ href, label }) => (
            <DialogClose asChild key={href}>
              <a href={href} className={styles.menuLink}>
                {label}
                <ArrowRight size={17} />
              </a>
            </DialogClose>
          ))}
        </nav>
        <div className={styles.menuActions}>
          <DialogClose asChild>
            <a href={appLinks.register} className={styles.primaryButton}>
              Crear cuenta <ArrowRight size={17} />
            </a>
          </DialogClose>
          <DialogClose asChild>
            <a href={appLinks.login} className={styles.secondaryButton}>
              Iniciar sesión
            </a>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { Metadata } from 'next';
import { LegalDocument } from '@/features/legal/LegalDocument';
import { cookiesSections } from '@/features/legal/cookies-content';

export const metadata: Metadata = {
  title: 'Cookies y preferencias | Kids4Safe',
  description: 'Conoce cómo Kids4Safe recuerda tu elección de cookies y cómo gestionar tus preferencias desde el navegador.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookies y preferencias"
      introduction="Tu privacidad también importa. Conoce qué recuerda esta web sobre tu elección de cookies y cómo puedes gestionar esa preferencia."
      sections={cookiesSections}
      currentPath="/cookies"
      notice="Esta página describe el funcionamiento actual del aviso de cookies. La política legal completa está pendiente de publicación."
    />
  );
}

import type { Metadata } from 'next';
import { LegalDocument } from '@/features/legal/LegalDocument';
import { privacySections } from '@/features/legal/privacy-content';

export const metadata: Metadata = {
  title: 'Privacidad y permisos | Kids4Safe',
  description: 'Conoce la información que puede utilizar Kids4Safe, los permisos de ubicación y medios, y los controles disponibles en la app y el navegador.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacidad y permisos"
      introduction="Conoce qué información puede utilizar Kids4Safe, para qué sirven los permisos y qué controles tienes a tu alcance."
      sections={privacySections}
      currentPath="/privacy"
      notice="Esta guía resume las funciones actuales de Kids4Safe. La política de privacidad definitiva está pendiente de publicación."
    />
  );
}

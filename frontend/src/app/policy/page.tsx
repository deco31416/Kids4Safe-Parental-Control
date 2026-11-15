import type { Metadata } from 'next';
import { LegalDocument } from '@/features/legal/LegalDocument';
import { policySections } from '@/features/legal/policy-content';

export const metadata: Metadata = {
  title: 'Políticas de uso | Kids4Safe',
  description: 'Guía de uso de Kids4Safe: acompañamiento familiar, permisos del dispositivo, cuidado de la cuenta y botón de Auxilio.',
  alternates: { canonical: '/policy' },
};

export default function PolicyPage() {
  return (
    <LegalDocument
      title="Políticas de uso"
      introduction="Conoce los principios de uso de Kids4Safe para acompañar a tus hijos con confianza, permisos claros y responsabilidad compartida."
      sections={policySections}
    />
  );
}

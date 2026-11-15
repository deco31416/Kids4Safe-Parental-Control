import type { Metadata } from 'next';
import { NotFoundPage } from '@/features/errors/NotFoundPage';

export const metadata: Metadata = {
  title: 'Página no encontrada | Kids4Safe',
  description: 'No encontramos esta página. Vuelve al inicio de Kids4Safe para seguir descubriendo sus herramientas de protección familiar.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundPage />;
}

import Link from 'next/link';
import { Kids4SafeBrand } from '@/components/common/Kids4SafeBrand';

export function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex transition-opacity hover:opacity-80"
      aria-label="Kids4Safe: ir al inicio"
    >
      <Kids4SafeBrand />
    </Link>
  );
}

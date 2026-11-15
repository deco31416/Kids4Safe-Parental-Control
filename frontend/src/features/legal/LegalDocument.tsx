import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { Kids4SafeBrand } from '@/components/common/Kids4SafeBrand';
import styles from './LegalDocument.module.css';

export type LegalSection = {
  id: string;
  title: string;
  description: string;
  points: string[];
};

const documentLinks = [
  { href: '/privacy', label: 'Privacidad' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/policy', label: 'Políticas de uso' },
];

type LegalDocumentProps = {
  title: string;
  introduction: string;
  sections: LegalSection[];
  currentPath?: '/policy' | '/cookies' | '/privacy';
  notice?: string;
};

export function LegalDocument({
  title,
  introduction,
  sections,
  currentPath = '/policy',
  notice = 'Los términos legales completos están pendientes de publicación.',
}: LegalDocumentProps) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido-documento">Ir al contenido</a>
      <header className={styles.header}>
        <div className={styles.navigation}>
          <Link className={styles.brand} href="/" aria-label="Kids4Safe: ir al inicio">
            <Kids4SafeBrand />
          </Link>
          <Link className={styles.backLink} href="/" aria-label="Volver al inicio">
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Volver <span className={styles.backExtra}>al inicio</span></span>
          </Link>
        </div>
      </header>

      <main id="contenido-documento" className={styles.container}>
        <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
          <Link href="/">Inicio</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>

        <section className={styles.hero} aria-labelledby="document-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Confianza y cuidado</span>
            <h1 id="document-title">{title}</h1>
            <p>{introduction}</p>
          </div>
          <div className={styles.heroAside}>
            <div className={styles.shield}><ShieldCheck size={51} strokeWidth={1.5} aria-hidden="true" /></div>
            <p>La confianza va primero.</p>
            <span>El cuidado lo decidimos en familia.</span>
          </div>
        </section>

        <div className={styles.notice}>
          <Info size={19} aria-hidden="true" />
          <p><strong>Guía informativa.</strong> {notice}</p>
        </div>

        <div className={styles.documentLayout}>
          <aside className={styles.sidebar}>
            <nav className={styles.contents} aria-labelledby="contents-heading">
              <p id="contents-heading" className={styles.contentsTitle}>En esta página</p>
              <ol>
                {sections.map(({ id, title: sectionTitle }, index) => (
                  <li key={id}>
                    <a href={`#${id}`}>
                      <span className={styles.indexNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span>{sectionTitle}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <p className={styles.sideNote}>Información sencilla para usar Kids4Safe con confianza.</p>
          </aside>

          <article className={styles.document} aria-label={title}>
            {sections.map(({ id, title: sectionTitle, description, points }, index) => (
              <section key={id} id={id} className={styles.documentSection} aria-labelledby={`${id}-heading`}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h2 id={`${id}-heading`}>{sectionTitle}</h2>
                </div>
                <p>{description}</p>
                <ul>
                  {points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </section>
            ))}

            <div className={styles.related}>
              <p>También puedes consultar</p>
              <div className={styles.relatedLinks}>
                {documentLinks.filter(({ href }) => href !== currentPath).map(({ href, label }) => (
                  <Link key={href} href={href}>{label} <ArrowUpRight size={17} aria-hidden="true" /></Link>
                ))}
              </div>
            </div>
          </article>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>© {new Date().getFullYear()} Kids4Safe</p>
          <nav aria-label="Información del sitio">
            {documentLinks.map(({ href, label }) => href === currentPath ? (
              <span key={href} aria-current="page">{label}</span>
            ) : (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

import { LandingPage } from '@/features/landing';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import {
  canIndexSite,
  siteDescription,
  siteTitle,
  siteUrl,
  socialImage,
} from '@/lib/site';

const jakarta = localFont({
  src: [
    {
      path: '../features/landing/assets/fonts/PlusJakartaSans-Regular.ttf',
      weight: '400',
    },
    {
      path: '../features/landing/assets/fonts/PlusJakartaSans-Bold.ttf',
      weight: '700',
    },
    {
      path: '../features/landing/assets/fonts/PlusJakartaSans-ExtraBold.ttf',
      weight: '800',
    },
  ],
  display: 'swap',
});

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: '/' },
  robots: {
    index: canIndexSite,
    follow: true,
    googleBot: {
      index: canIndexSite,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    siteName: 'Kids4Safe',
    title: siteTitle,
    description: siteDescription,
    url: '/',
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [socialImage],
  },
};

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Kids4Safe',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/brand/logo.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Kids4Safe',
        url: `${siteUrl}/`,
        inLanguage: 'es',
        description: siteDescription,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  };
  return (
    <div className={jakarta.className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <LandingPage />
    </div>
  );
}

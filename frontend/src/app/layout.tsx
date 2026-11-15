import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/animations.css';
import { Providers } from '@/providers';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { siteUrl, siteTitle, siteDescription } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  icons: { icon: '/brand/favicon.png', apple: '/brand/favicon.png' },
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: 'Kids4Safe',
  // Only the public landing explicitly opts into indexing.
  robots: { index: false, follow: false },
};

const themeInitScript = `
(() => {
  try {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  } catch (_) {
    // no-op
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

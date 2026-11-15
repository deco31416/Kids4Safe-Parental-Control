// The public domain is independent of the internal Railway host and request headers.
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kids4safe.io',
).origin;

export const canIndexSite =
  process.env.NODE_ENV === 'production' &&
  process.env.SEO_INDEXABLE !== 'false' &&
  siteUrl.startsWith('https://') &&
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(siteUrl).hostname);

export const siteTitle = 'Kids4Safe | Control parental para cuidar a tus hijos';
export const siteDescription =
  'Cuida a tus hijos con Kids4Safe: app de control parental con ubicación compartida, botón de Auxilio y contactos de emergencia. Crea tu cuenta y empieza.';

export const socialImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Kids4Safe: control parental para cuidar a tus hijos. Ubicación, Auxilio y protección familiar.',
};

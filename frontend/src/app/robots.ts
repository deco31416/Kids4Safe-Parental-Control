import type { MetadataRoute } from 'next';
import { canIndexSite, siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!canIndexSite) return { rules: { userAgent: '*', disallow: '/' } };

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/s/', '/live/', '/test-permissions'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

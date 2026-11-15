import type { MetadataRoute } from 'next';
import { canIndexSite, siteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return canIndexSite ? [{ url: `${siteUrl}/` }] : [];
}

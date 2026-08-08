import { MetadataRoute } from 'next';
import { restaurantConfig } from '@/config/restaurant';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin and checkout surfaces must never be indexed.
        disallow: ['/admin', '/api/', '/checkout', '/cart'],
      },
    ],
    sitemap: `${restaurantConfig.siteUrl}/sitemap.xml`,
  };
}

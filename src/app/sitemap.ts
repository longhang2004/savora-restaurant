import { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blog-posts';
import { restaurantConfig } from '@/config/restaurant';

export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = restaurantConfig.siteUrl;
  // Static content has a fixed reference date (no build-time nondeterminism).
  const staticLastModified = new Date('2026-05-20T00:00:00Z');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/menu`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/reservations`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}

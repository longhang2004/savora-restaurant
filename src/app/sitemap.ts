import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/metadata';
import { blogPosts } from '@/data/blog-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/menu', '/about', '/reservations', '/blog', '/contact'].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  const blogRoutes = blogPosts.map((post) => {
    // Attempt to parse post.date to Date, default to current Date if parsing fails
    let postDate = new Date();
    try {
      const parsed = Date.parse(post.date);
      if (!isNaN(parsed)) {
        postDate = new Date(parsed);
      }
    } catch {
      // Keep current Date
    }

    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: postDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  return [...staticRoutes, ...blogRoutes];
}

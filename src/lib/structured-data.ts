/**
 * JSON-LD structured data builders.
 *
 * All builders read from the central restaurant configuration; menu
 * schema is generated from live database data.
 */
import { restaurantConfig } from '@/config/restaurant';
import type { PublicMenuItem } from '@/features/menu/queries';

const SITE_URL = restaurantConfig.siteUrl;

export function generateBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function generateMenuSchema(items: PublicMenuItem[]) {
  const categories = [...new Set(items.map((item) => item.category.name))];

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${SITE_URL}/menu#menu`,
    name: `${restaurantConfig.name} Menu`,
    url: `${SITE_URL}/menu`,
    hasMenuSection: categories.map((categoryName) => ({
      '@type': 'MenuSection',
      name: categoryName,
      hasMenuItem: items
        .filter((item) => item.category.name === categoryName)
        .map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description,
          offers: {
            '@type': 'Offer',
            price: (item.priceCents / 100).toFixed(2),
            priceCurrency: restaurantConfig.currency,
            availability: item.isAvailable
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          },
        })),
    })),
  };
}

export function generateArticleSchema(post: {
  title: string;
  description: string;
  date: string;
  author: string;
  slug: string;
  image: string;
}) {
  const dateISO = new Date(post.date).toISOString();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: dateISO,
    dateModified: dateISO,
    author: { '@type': 'Person', name: post.author },
    image: `${SITE_URL}${post.image}`,
    publisher: {
      '@type': 'Restaurant',
      name: restaurantConfig.name,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/og-main.png`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };
}

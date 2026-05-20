import { MenuItem } from '@/data/menu';
import { BlogPost } from '@/data/blog-posts';

const SITE_URL = 'https://savora-restaurant.vercel.app';

// Generates BreadcrumbList Schema
export function generateBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item.startsWith('http') ? item.item : `${SITE_URL}${item.item}`,
    })),
  };
}

// Generates Menu Schema
export function generateMenuSchema(items: MenuItem[]) {
  const menuSections = ['starters', 'mains', 'desserts', 'drinks'].map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    return {
      '@type': 'MenuSection',
      name: category.charAt(0).toUpperCase() + category.slice(1),
      hasMenuItem: categoryItems.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'USD',
        },
        suitableForDiet: item.vegetarian ? 'https://schema.org/VegetarianDiet' : undefined,
      })),
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Savora Fusion Menu',
    mainEntityOfPage: `${SITE_URL}/menu`,
    hasMenuSection: menuSections,
  };
}

// Generates Article (Blog) Schema
export function generateArticleSchema(post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/blog/${post.slug}#article`,
    isPartOf: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    },
    headline: post.title,
    description: post.description,
    image: `${SITE_URL}${post.image}`,
    datePublished: new Date(post.date).toISOString(),
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Savora Restaurant',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

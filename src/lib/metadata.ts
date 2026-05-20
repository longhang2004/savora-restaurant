import { Metadata } from 'next';

export const SITE_URL = 'https://savora-restaurant.vercel.app';

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  keywords?: string[];
  noIndex?: boolean;
}

export function generatePageMetadata({
  title,
  description,
  path,
  ogImage = '/images/og-main.png',
  keywords = [],
  noIndex = false,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} | Savora Restaurant`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: [
      'vietnamese fusion',
      'luxury dining hcmc',
      'thu duc restaurant',
      'savora',
      ...keywords,
    ],
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: canonicalUrl,
      title: fullTitle,
      description,
      siteName: 'Savora Restaurant',
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: true,
      },
    }),
  };
}

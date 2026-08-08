import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/components/cart/CartProvider';
import { restaurantConfig } from '@/config/restaurant';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const SITE_URL = restaurantConfig.siteUrl;

export const metadata: Metadata = {
  title: {
    default: 'Savora | Premium Vietnamese-Fusion Restaurant',
    template: '%s | Savora Restaurant',
  },
  description:
    'Savora merges traditional Vietnamese flavors with modern culinary techniques. Enjoy an upscale dining experience in District 1, HCMC.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  keywords: [
    'vietnamese fusion',
    'luxury dining hcmc',
    'saigon restaurant',
    'savora',
    'vietnamese gastronomy',
    'modern vietnamese restaurant',
  ],
  authors: [{ name: 'Hàng Nhựt Long' }],
  creator: 'Hàng Nhựt Long',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Savora Restaurant',
    title: 'Savora | Premium Vietnamese-Fusion Restaurant',
    description:
      'Traditional Vietnamese heritage meets modern gastronomy. Discover a curated menu of contemporary fusion dishes.',
    images: [
      {
        url: '/images/og-main.png',
        width: 1200,
        height: 630,
        alt: 'Savora Fine Dining Restaurant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Savora | Premium Vietnamese-Fusion Restaurant',
    description:
      'Traditional Vietnamese heritage meets modern gastronomy. Discover a curated menu of contemporary fusion dishes.',
    images: ['/images/og-main.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Structured data (JSON-LD) for Restaurant — driven by central config.
const restaurantSchema = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': `${SITE_URL}/#restaurant`,
  name: restaurantConfig.name,
  image: `${SITE_URL}/images/restaurant-hero.png`,
  url: SITE_URL,
  telephone: restaurantConfig.phone,
  priceRange: '$$$$',
  menu: `${SITE_URL}/menu`,
  servesCuisine: 'Vietnamese Fusion, Contemporary Vietnamese, Modern Gastronomy',
  acceptsReservations: 'true',
  address: {
    '@type': 'PostalAddress',
    streetAddress: restaurantConfig.address.street,
    addressLocality: restaurantConfig.address.district,
    addressRegion: restaurantConfig.address.city,
    postalCode: restaurantConfig.address.postalCode,
    addressCountry: restaurantConfig.address.country,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: String(restaurantConfig.geo.latitude),
    longitude: String(restaurantConfig.geo.longitude),
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: restaurantConfig.openingHours.weekdays.open,
      closes: restaurantConfig.openingHours.weekdays.close,
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: restaurantConfig.openingHours.weekends.open,
      closes: restaurantConfig.openingHours.weekends.close,
    },
  ],
  sameAs: [restaurantConfig.social.facebook, restaurantConfig.social.instagram],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
        />
      </head>
      <body>
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <CartProvider>
          <Header />
          <main style={{ minHeight: '80vh', paddingTop: '80px' }}>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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

const SITE_URL = 'https://savora-restaurant.vercel.app';

export const metadata: Metadata = {
  title: {
    default: 'Savora | Premium Vietnamese-Fusion Restaurant',
    template: '%s | Savora Restaurant',
  },
  description: 'Savora merges traditional Vietnamese flavors with modern culinary techniques. Enjoy an upscale dining experience in Thu Duc, HCMC.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  keywords: ['vietnamese fusion', 'luxury dining hcmc', 'thu duc restaurant', 'savora', 'vietnamese gastronomy', 'modern vietnamese restaurant'],
  authors: [{ name: 'Hàng Nhựt Long' }],
  creator: 'Hàng Nhựt Long',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Savora Restaurant',
    title: 'Savora | Premium Vietnamese-Fusion Restaurant',
    description: 'Traditional Vietnamese heritage meets modern gastronomy. Discover a curated menu of contemporary fusion dishes.',
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
    description: 'Traditional Vietnamese heritage meets modern gastronomy. Discover a curated menu of contemporary fusion dishes.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured data (JSON-LD) for LocalBusiness/Restaurant
  const restaurantSchema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITE_URL}/#restaurant`,
    name: 'Savora Restaurant',
    image: `${SITE_URL}/images/restaurant-hero.png`,
    url: SITE_URL,
    telephone: '+84786907453',
    priceRange: '$$$$',
    menu: `${SITE_URL}/menu`,
    servesCuisine: 'Vietnamese Fusion, Contemporary Vietnamese, Modern Gastronomy',
    acceptsReservations: 'true',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '120 Nguyen Van Ba',
      addressLocality: 'Thu Duc',
      addressRegion: 'Ho Chi Minh City',
      postalCode: '700000',
      addressCountry: 'VN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '10.8458',
      longitude: '106.7763',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '11:30',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '11:00',
        closes: '23:00',
      },
    ],
    sameAs: [
      'https://facebook.com/savorarestaurant',
      'https://instagram.com/savorarestaurant',
    ],
  };

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
        <Header />
        <main style={{ minHeight: '80vh', paddingTop: '80px' }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

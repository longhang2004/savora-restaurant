/**
 * Central restaurant configuration.
 *
 * Single source of truth for restaurant identity, business hours, service
 * periods, reservation rules, delivery policy and money/tax settings.
 * Everything else (SEO metadata, JSON-LD, forms, availability engine,
 * admin views) reads from here.
 *
 * Pure constants (safe for both server and client components).
 */
export const RESTAURANT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const restaurantConfig = {
  name: 'Savora Restaurant',
  shortName: 'Savora',

  /** Absolute site URL used for canonicals, OG images and structured data. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://savora-restaurant.vercel.app',

  currency: 'VND',
  /** Tax rate in basis points applied to the item subtotal at checkout. */
  taxRateBps: 500, // 5%

  address: {
    street: '15 Le Loi Street',
    district: 'District 1',
    city: 'Ho Chi Minh City',
    postalCode: '700000',
    country: 'VN',
  },

  geo: {
    latitude: 10.7769,
    longitude: 106.7009,
  },

  phone: '+84786907453',
  phoneDisplay: '+84 786 907 453',

  emails: {
    general: 'info@savora.vn',
    reservations: 'reservations@savora.vn',
    events: 'events@savora.vn',
  },

  /** Wall-clock opening hours by day type (Asia/Ho_Chi_Minh). */
  openingHours: {
    weekdays: { open: '11:30', close: '22:00' },
    weekends: { open: '11:00', close: '23:00' },
  },

  /**
   * Service periods used by the availability engine to generate candidate
   * slots. A slot is only offered when the reservation can finish before
   * the period ends.
   */
  servicePeriods: [
    { id: 'lunch', label: 'Lunch', start: '11:30', end: '14:30' },
    { id: 'dinner', label: 'Dinner', start: '17:30', end: '22:00' },
  ] as const,

  reservation: {
    slotIntervalMinutes: 30,
    durationMinutes: 120,
    /** Maximum party size bookable online. Larger parties → events inquiry. */
    maxOnlinePartySize: 8,
    /** How far in advance customers may book. */
    maxAdvanceDays: 30,
  },

  ordering: {
    /** Maximum horizon for scheduled pickup and delivery orders. */
    maxScheduledDays: 30,
  },

  delivery: {
    supportedDistricts: [
      'District 1',
      'District 2',
      'District 3',
      'District 4',
      'Binh Thanh',
      'Thu Duc City',
    ],
    // Converted from the former US$5 fee at 26,186.832633 VND/USD on
    // 2026-08-08, rounded to a customer-friendly 1,000₫.
    feeCents: 131_000,
  },

  social: {
    facebook: 'https://facebook.com/savorarestaurant',
    instagram: 'https://instagram.com/savorarestaurant',
  },
} as const;

export type RestaurantConfig = typeof restaurantConfig;

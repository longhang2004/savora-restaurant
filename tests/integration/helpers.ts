/**
 * Shared integration-test helpers. Tests run against a real PostgreSQL
 * (embedded binaries or TEST_DATABASE_URL) with the app's own modules —
 * the same code paths production uses.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/lib/db/schema';

export const ALL_TABLES = [
  'payos_webhook_events',
  'stripe_webhook_events',
  'payments',
  'order_item_modifiers',
  'order_items',
  'orders',
  'newsletter_subscribers',
  'contact_inquiries',
  'reservation_tables',
  'reservations',
  'dining_tables',
  'menu_item_modifier_groups',
  'modifier_options',
  'modifier_groups',
  'menu_items',
  'menu_categories',
  'admin_profiles',
];

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('No test database URL available.');
  const client = postgres(url, { max: 5 });
  const db = drizzle(client, { schema });
  return { db, client };
}

export async function resetDb(
  db: ReturnType<typeof drizzle<typeof schema>>,
  tables: string[] = ALL_TABLES,
) {
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`));
}

/** Deterministic fixture ids. */
export const IDS = {
  categoryStarters: '00000000-0000-0000-0000-000000000001',
  categoryMains: '00000000-0000-0000-0000-000000000002',
  categoryDrinks: '00000000-0000-0000-0000-000000000003',
  pho: '00000000-0000-0000-0000-000000000010',
  martini: '00000000-0000-0000-0000-000000000011',
  soldOut: '00000000-0000-0000-0000-000000000012',
  phoSizeGroup: '00000000-0000-0000-0000-000000000020',
  phoExtrasGroup: '00000000-0000-0000-0000-000000000021',
  martiniSweetnessGroup: '00000000-0000-0000-0000-000000000022',
  optRegular: '00000000-0000-0000-0000-000000000030',
  optLarge: '00000000-0000-0000-0000-000000000031',
  optWagyu: '00000000-0000-0000-0000-000000000032',
  optEgg: '00000000-0000-0000-0000-000000000033',
  optNoodles: '00000000-0000-0000-0000-000000000034',
  optSweet50: '00000000-0000-0000-0000-000000000035',
  tableT01: '00000000-0000-0000-0000-000000000040',
  tableT02: '00000000-0000-0000-0000-000000000041',
  tableT03: '00000000-0000-0000-0000-000000000042',
  tableT04: '00000000-0000-0000-0000-000000000043',
  tableT05: '00000000-0000-0000-0000-000000000044',
  tableP01: '00000000-0000-0000-0000-000000000045',
} as const;

export async function seedMenuFixtures(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db.insert(schema.menuCategories).values([
    { id: IDS.categoryStarters, name: 'Starters', slug: 'starters', sortOrder: 10 },
    { id: IDS.categoryMains, name: 'Mains', slug: 'mains', sortOrder: 20 },
    { id: IDS.categoryDrinks, name: 'Drinks', slug: 'drinks', sortOrder: 30 },
  ]);

  await db.insert(schema.menuItems).values([
    {
      id: IDS.pho,
      categoryId: IDS.categoryMains,
      name: 'A5 Wagyu Beef Phở',
      slug: 'a5-wagyu-beef-pho',
      description: '36-hour bone broth with A5 wagyu.',
      priceCents: 1_100_000,
      isFeatured: true,
      isAvailable: true,
    },
    {
      id: IDS.martini,
      categoryId: IDS.categoryDrinks,
      name: 'Egg Coffee Martini',
      slug: 'egg-coffee-martini',
      description: 'Espresso, vodka, velvety foam.',
      priceCents: 393_000,
      isAvailable: true,
    },
    {
      id: IDS.soldOut,
      categoryId: IDS.categoryStarters,
      name: 'Lotus Tea',
      slug: 'lotus-tea',
      description: 'Lotus-scented green tea.',
      priceCents: 157_000,
      isAvailable: false,
    },
  ]);

  await db.insert(schema.modifierGroups).values([
    { id: IDS.phoSizeGroup, name: 'Size', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 10 },
    { id: IDS.phoExtrasGroup, name: 'Extras', minSelections: 0, maxSelections: 2, isRequired: false, sortOrder: 20 },
    { id: IDS.martiniSweetnessGroup, name: 'Sweetness', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 10 },
  ]);

  await db.insert(schema.modifierOptions).values([
    { id: IDS.optRegular, modifierGroupId: IDS.phoSizeGroup, name: 'Regular', priceDeltaCents: 0, sortOrder: 10 },
    { id: IDS.optLarge, modifierGroupId: IDS.phoSizeGroup, name: 'Large', priceDeltaCents: 210_000, sortOrder: 20 },
    { id: IDS.optWagyu, modifierGroupId: IDS.phoExtrasGroup, name: 'Extra Wagyu', priceDeltaCents: 314_000, sortOrder: 10 },
    { id: IDS.optEgg, modifierGroupId: IDS.phoExtrasGroup, name: 'Soft Egg', priceDeltaCents: 52_000, sortOrder: 20 },
    { id: IDS.optNoodles, modifierGroupId: IDS.phoExtrasGroup, name: 'Extra Noodles', priceDeltaCents: 79_000, sortOrder: 30 },
    { id: IDS.optSweet50, modifierGroupId: IDS.martiniSweetnessGroup, name: '50% Sweetness', priceDeltaCents: 0, sortOrder: 10 },
  ]);

  await db.insert(schema.menuItemModifierGroups).values([
    { menuItemId: IDS.pho, modifierGroupId: IDS.phoSizeGroup },
    { menuItemId: IDS.pho, modifierGroupId: IDS.phoExtrasGroup },
    { menuItemId: IDS.martini, modifierGroupId: IDS.martiniSweetnessGroup },
  ]);
}

export async function seedTableFixtures(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db.insert(schema.diningTables).values([
    { id: IDS.tableT01, name: 'T01', capacity: 2, sortOrder: 10 },
    { id: IDS.tableT02, name: 'T02', capacity: 2, sortOrder: 20 },
    { id: IDS.tableT03, name: 'T03', capacity: 4, sortOrder: 30 },
    { id: IDS.tableT04, name: 'T04', capacity: 4, sortOrder: 40 },
    { id: IDS.tableT05, name: 'T05', capacity: 6, sortOrder: 50 },
    { id: IDS.tableP01, name: 'P01', capacity: 8, isPrivate: true, sortOrder: 60 },
  ]);
}

/** A near-future restaurant-local date keeps scheduled-order tests realistic. */
function localDateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const TEST_DATE = localDateOffset(7);
export const TEST_TIME = '18:30';

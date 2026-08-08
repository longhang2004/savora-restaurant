/**
 * Savora database schema (Drizzle ORM, PostgreSQL).
 *
 * Conventions:
 *  - Money is always integer minor units (`*_cents`), never floats.
 *  - Timestamps are `timestamptz` and stored in UTC.
 *  - Order/product snapshots keep historical names & prices immutable.
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────

export const reservationStatusEnum = pgEnum('reservation_status', [
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', // created, awaiting payment
  'NEW', // paid, not yet accepted by kitchen
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
]);

export const paymentStatusEnum = pgEnum('payment_status', ['UNPAID', 'PAID']);

export const fulfillmentTypeEnum = pgEnum('fulfillment_type', ['pickup', 'delivery']);

export const adminRoleEnum = pgEnum('admin_role', ['ADMIN', 'STAFF']);

export const reservationSourceEnum = pgEnum('reservation_source', ['online', 'staff']);

// ─── Menu ─────────────────────────────────────────────────────────────

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    imagePath: text('image_path'),
    isFeatured: boolean('is_featured').notNull().default(false),
    isAvailable: boolean('is_available').notNull().default(true),
    dietaryTags: jsonb('dietary_tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('menu_items_category_idx').on(table.categoryId),
    index('menu_items_availability_idx').on(table.isAvailable),
  ],
);

export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  minSelections: integer('min_selections').notNull().default(0),
  maxSelections: integer('max_selections').notNull().default(1),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const modifierOptions = pgTable(
  'modifier_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modifierGroupId: uuid('modifier_group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceDeltaCents: integer('price_delta_cents').notNull().default(0),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('modifier_options_group_idx').on(table.modifierGroupId)],
);

export const menuItemModifierGroups = pgTable(
  'menu_item_modifier_groups',
  {
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    modifierGroupId: uuid('modifier_group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.menuItemId, table.modifierGroupId] })],
);

// ─── Reservations ─────────────────────────────────────────────────────

export const diningTables = pgTable('dining_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(),
  area: text('area').notNull().default('Main Dining'),
  isPrivate: boolean('is_private').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    confirmationCode: text('confirmation_code').notNull().unique(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    partySize: integer('party_size').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: reservationStatusEnum('status').notNull().default('CONFIRMED'),
    notes: text('notes'),
    source: reservationSourceEnum('source').notNull().default('online'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('reservations_time_idx').on(table.startsAt, table.endsAt),
    index('reservations_status_idx').on(table.status),
  ],
);

export const reservationTables = pgTable(
  'reservation_tables',
  {
    reservationId: uuid('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => diningTables.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({ columns: [table.reservationId, table.tableId] }),
    index('reservation_tables_table_idx').on(table.tableId),
  ],
);

// ─── Contact & newsletter ─────────────────────────────────────────────

export const contactInquiries = pgTable('contact_inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Orders (commerce) ────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicCode: text('public_code').notNull().unique(),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerPhone: text('customer_phone').notNull(),
    fulfillmentType: fulfillmentTypeEnum('fulfillment_type').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    deliveryAddress: jsonb('delivery_address').$type<{
      line1: string;
      district: string;
      city: string;
      notes?: string;
    } | null>(),
    status: orderStatusEnum('status').notNull().default('PENDING'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
    currency: text('currency').notNull().default('USD'),
    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    customerNotes: text('customer_notes'),
    checkoutKey: text('checkout_key').notNull().unique(),
    checkoutFingerprint: text('checkout_fingerprint').notNull().default(''),
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('orders_status_idx').on(table.status),
    index('orders_payment_status_idx').on(table.paymentStatus),
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_public_code_idx').on(table.publicCode),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
    itemName: text('item_name').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
    specialInstructions: text('special_instructions'),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);

export const orderItemModifiers = pgTable(
  'order_item_modifiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    modifierOptionId: uuid('modifier_option_id').references(() => modifierOptions.id, {
      onDelete: 'set null',
    }),
    groupName: text('group_name').notNull(),
    optionName: text('option_name').notNull(),
    priceDeltaCents: integer('price_delta_cents').notNull().default(0),
  },
  (table) => [index('order_item_modifiers_item_idx').on(table.orderItemId)],
);

// ─── Payments ─────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    stripeSessionId: text('stripe_session_id').unique(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('pending'), // pending | paid
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('payments_order_idx').on(table.orderId)],
);

export const stripeWebhookEvents = pgTable(
  'stripe_webhook_events',
  {
    stripeEventId: text('stripe_event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('stripe_webhook_events_type_idx').on(table.eventType)],
);

// ─── Admin ────────────────────────────────────────────────────────────

export const adminProfiles = pgTable('admin_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(), // Supabase Auth user id
  displayName: text('display_name').notNull(),
  role: adminRoleEnum('role').notNull().default('STAFF'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type ModifierOption = typeof modifierOptions.$inferSelect;
export type DiningTable = typeof diningTables.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AdminProfile = typeof adminProfiles.$inferSelect;

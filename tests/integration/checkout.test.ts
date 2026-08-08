/**
 * Commerce integration tests: server-authoritative pricing, modifier
 * validation, sold-out protection, immutable snapshots, duplicate
 * checkout protection — all against real PostgreSQL.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb, seedMenuFixtures, IDS, TEST_DATE } from './helpers';
import { priceAndValidateCart } from '@/features/orders/pricing';
import { createCheckoutOrder } from '@/features/checkout/service';
import { menuItems, orders, orderItems, orderItemModifiers } from '@/lib/db/schema';
import { ErrorCodes } from '@/lib/errors';
import { localToUtc } from '@/lib/time';

const { db } = createTestDb();

const baseCheckout = {
  customerName: 'Commerce Guest',
  customerEmail: 'commerce@test.dev',
  customerPhone: '+84900000001',
  fulfillmentType: 'pickup' as const,
  scheduledFor: null,
  deliveryAddress: null,
  customerNotes: null,
  checkoutKey: 'ck_test_unique_key_0001',
};

beforeAll(async () => {
  await resetDb(db);
  await seedMenuFixtures(db);
});

beforeEach(async () => {
  await db.delete(orderItemModifiers);
  await db.delete(orderItems);
  await db.delete(orders);
});

const phoLine = (overrides: Partial<{ quantity: number; modifierOptionIds: string[]; specialInstructions: string }> = {}) => ({
  menuItemId: IDS.pho,
  quantity: 1,
  modifierOptionIds: [IDS.optRegular],
  ...overrides,
});

describe('server-authoritative pricing', () => {
  it('prices lines from the database, not the client', async () => {
    const priced = await priceAndValidateCart([phoLine({ modifierOptionIds: [IDS.optLarge, IDS.optWagyu] })]);
    expect(priced.subtotalCents).toBe(4200 + 800 + 1200); // 6200

    // Change the price in the DB → next pricing run uses it.
    await db.update(menuItems).set({ priceCents: 9999 }).where(eq(menuItems.id, IDS.pho));
    const repriced = await priceAndValidateCart([phoLine()]);
    expect(repriced.subtotalCents).toBe(9999);
  });

  it('ignores client-supplied price fields (spoofing attempt)', async () => {
    const result = await createCheckoutOrder({
      ...baseCheckout,
      checkoutKey: 'ck_test_spoof_0002',
      lines: [
        {
          menuItemId: IDS.pho,
          quantity: 1,
          modifierOptionIds: [IDS.optRegular],
          // Extra client-supplied fields are stripped by the server schema.
          priceCents: 1,
        },
      ],
    });
    expect(result.mode).toBe('sandbox'); // no Stripe configured → demo sandbox
    expect(result.url).toMatch(/\/checkout\/sandbox\?order=SV-[^&]+&token=[A-Za-z0-9_-]+$/);

    const [order] = await db.select().from(orders).where(eq(orders.checkoutKey, 'ck_test_spoof_0002'));
    expect(order.subtotalCents).toBe(9999); // DB price, not 1
  });

  it('computes delivery fee and tax correctly', async () => {
    const result = await createCheckoutOrder({
      ...baseCheckout,
      fulfillmentType: 'delivery',
      deliveryAddress: { line1: '12 Nguyen Hue', district: 'District 1', city: 'Ho Chi Minh City' },
      checkoutKey: 'ck_test_delivery_0003',
      lines: [phoLine({ quantity: 2 })],
    });
    void result;
    const [order] = await db.select().from(orders).where(eq(orders.checkoutKey, 'ck_test_delivery_0003'));
    expect(order.subtotalCents).toBe(9999 * 2);
    expect(order.deliveryFeeCents).toBe(500);
    expect(order.taxCents).toBe(Math.round((9999 * 2 * 500) / 10_000));
    expect(order.totalCents).toBe(order.subtotalCents + order.deliveryFeeCents + order.taxCents);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('UNPAID');
  });

  it('stores scheduled datetime-local input in the restaurant timezone', async () => {
    await createCheckoutOrder({
      ...baseCheckout,
      scheduledFor: `${TEST_DATE}T18:30`,
      checkoutKey: 'ck_test_local_schedule_0008',
      lines: [phoLine()],
    });

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.checkoutKey, 'ck_test_local_schedule_0008'));
    expect(order.scheduledFor?.toISOString()).toBe(localToUtc(TEST_DATE, '18:30').toISOString());
  });

  it('rejects scheduled checkout outside restaurant service hours', async () => {
    await expect(
      createCheckoutOrder({
        ...baseCheckout,
        scheduledFor: `${TEST_DATE}T03:00`,
        checkoutKey: 'ck_test_closed_schedule_0011',
        lines: [phoLine()],
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_FAILED });
  });

  it('rejects delivery to an unsupported district', async () => {
    await expect(
      createCheckoutOrder({
        ...baseCheckout,
        fulfillmentType: 'delivery',
        deliveryAddress: { line1: '1 Anywhere', district: 'Cu Chi', city: 'Ho Chi Minh City' },
        checkoutKey: 'ck_test_area_0004',
        lines: [phoLine()],
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_FAILED });
  });
});

describe('availability enforcement', () => {
  it('rejects a sold-out item even with a stale cart', async () => {
    await expect(
      priceAndValidateCart([{ menuItemId: IDS.soldOut, quantity: 1, modifierOptionIds: [] }]),
    ).rejects.toMatchObject({ code: ErrorCodes.MENU_ITEM_UNAVAILABLE });

    await expect(
      createCheckoutOrder({
        ...baseCheckout,
        checkoutKey: 'ck_test_soldout_0005',
        lines: [{ menuItemId: IDS.soldOut, quantity: 1, modifierOptionIds: [] }],
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MENU_ITEM_UNAVAILABLE });
  });
});

describe('modifier validation', () => {
  it('rejects an invalid modifier option id', async () => {
    await expect(
      priceAndValidateCart([phoLine({ modifierOptionIds: ['not-a-real-option'] })]),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_MODIFIER_SELECTION });
  });

  it('rejects a modifier from another product', async () => {
    // The martini's sweetness option must not be accepted on the pho.
    await expect(
      priceAndValidateCart([phoLine({ modifierOptionIds: [IDS.optRegular, IDS.optSweet50] })]),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_MODIFIER_SELECTION });
  });

  it('rejects a missing required modifier', async () => {
    await expect(
      priceAndValidateCart([phoLine({ modifierOptionIds: [] })]),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_MODIFIER_SELECTION });
  });

  it('rejects exceeding max selections', async () => {
    await expect(
      priceAndValidateCart([phoLine({ modifierOptionIds: [IDS.optRegular, IDS.optWagyu, IDS.optEgg, IDS.optNoodles] })]),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_MODIFIER_SELECTION });
  });
});

describe('order snapshots', () => {
  it('keeps historical order snapshots when menu data changes', async () => {
    await createCheckoutOrder({
      ...baseCheckout,
      checkoutKey: 'ck_test_snapshot_0006',
      lines: [phoLine({ modifierOptionIds: [IDS.optRegular, IDS.optWagyu] })],
    });
    const [order] = await db.select().from(orders).where(eq(orders.checkoutKey, 'ck_test_snapshot_0006'));
    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(item.itemName).toBe('A5 Wagyu Beef Phở');
    // unit price includes the selected modifier deltas (9999 + 1200)
    expect(item.unitPriceCents).toBe(11199);

    // Menu changes after the order…
    await db
      .update(menuItems)
      .set({ name: 'Renamed Phở', priceCents: 1 })
      .where(eq(menuItems.id, IDS.pho));

    // …must not mutate the stored snapshot.
    const [after] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(after.itemName).toBe('A5 Wagyu Beef Phở');
    expect(after.unitPriceCents).toBe(11199);

    const mods = await db
      .select()
      .from(orderItemModifiers)
      .where(eq(orderItemModifiers.orderItemId, item.id));
    expect(mods).toHaveLength(2);
    expect(mods.map((m) => m.optionName).sort()).toEqual(['Extra Wagyu', 'Regular']);
    expect(mods.map((m) => m.priceDeltaCents).sort((a, b) => a - b)).toEqual([0, 1200]);
  });
});

describe('checkout idempotency', () => {
  it('resumes a duplicate checkout submission without creating a second order', async () => {
    const attempt = () =>
      createCheckoutOrder({
        ...baseCheckout,
        checkoutKey: 'ck_test_duplicate_0007',
        lines: [phoLine()],
      });

    const first = await attempt();
    const second = await attempt();
    expect(second.publicCode).toBe(first.publicCode);

    const [{ count: total }] = await db.select({ count: count() }).from(orders);
    expect(total).toBe(1);
  });

  it('rejects reusing a checkout key for a materially different request', async () => {
    await createCheckoutOrder({
      ...baseCheckout,
      checkoutKey: 'ck_test_mismatch_0009',
      lines: [phoLine()],
    });

    await expect(
      createCheckoutOrder({
        ...baseCheckout,
        checkoutKey: 'ck_test_mismatch_0009',
        customerEmail: 'different@example.com',
        lines: [phoLine({ quantity: 2 })],
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.CHECKOUT_DUPLICATE });
  });
});

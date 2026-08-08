import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb, seedMenuFixtures, IDS } from './helpers';
import { menuItems, orderItems, orders } from '@/lib/db/schema';

const createCheckoutSession = vi
  .fn();
const retrieveReusableCheckoutSession = vi.fn();

vi.mock('@/features/payments/stripe', () => ({
  stripeConfigured: vi.fn(() => true),
  createCheckoutSession,
  retrieveReusableCheckoutSession,
}));

const { createCheckoutOrder } = await import('@/features/checkout/service');

const { db } = createTestDb();

const checkout = {
  customerName: 'Retry Guest',
  customerEmail: 'retry@example.com',
  customerPhone: '+84900000001',
  fulfillmentType: 'pickup' as const,
  scheduledFor: null,
  deliveryAddress: null,
  customerNotes: null,
  checkoutKey: 'ck_test_retry_0010',
  lines: [{ menuItemId: IDS.pho, modifierOptionIds: [IDS.optRegular], quantity: 1 }],
};

beforeAll(async () => {
  await resetDb(db);
  await seedMenuFixtures(db);
});

beforeEach(async () => {
  await db.delete(orders);
  await db.update(menuItems).set({ priceCents: 4200, isAvailable: true });
  createCheckoutSession.mockReset();
  retrieveReusableCheckoutSession.mockReset();
});

describe('checkout retry after payment handoff failure', () => {
  it('reuses the persisted order on retry', async () => {
    createCheckoutSession
      .mockRejectedValueOnce(new Error('temporary Stripe outage'))
      .mockResolvedValue({ sessionId: 'cs_retry_success', url: 'https://checkout.test/retry' });

    await expect(createCheckoutOrder(checkout)).rejects.toThrow('temporary Stripe outage');

    const resumed = await createCheckoutOrder(checkout);
    expect(resumed.publicCode).toMatch(/^SV-/);
    expect(resumed.url).toBe('https://checkout.test/retry');
    expect(createCheckoutSession).toHaveBeenCalledTimes(2);

    const [{ count: total }] = await db.select({ count: count() }).from(orders);
    expect(total).toBe(1);
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.publicCode, resumed.publicCode));
    expect(order.stripeCheckoutSessionId).toBe('cs_retry_success');
  });

  it('uses the persisted snapshot and total after the menu price changes', async () => {
    createCheckoutSession
      .mockRejectedValueOnce(new Error('temporary Stripe outage'))
      .mockResolvedValue({ sessionId: 'cs_retry_price_change', url: 'https://checkout.test/retry-price' });

    await expect(createCheckoutOrder(checkout)).rejects.toThrow('temporary Stripe outage');
    await db.update(menuItems).set({ priceCents: 4500 }).where(eq(menuItems.id, IDS.pho));

    const resumed = await createCheckoutOrder(checkout);
    const secondAttempt = createCheckoutSession.mock.calls[1][0];
    const [snapshot] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, (await db.select().from(orders).where(eq(orders.publicCode, resumed.publicCode)))[0].id));
    const [order] = await db.select().from(orders).where(eq(orders.publicCode, resumed.publicCode));

    expect(order.totalCents).toBe(4410);
    expect(snapshot.unitPriceCents).toBe(4200);
    expect(secondAttempt.lines[0].unitPriceCents).toBe(4200);
    expect(secondAttempt.taxCents).toBe(210);
    expect(secondAttempt.order.totalCents).toBe(order.totalCents);
    expect(order.stripeCheckoutSessionId).toBe('cs_retry_price_change');
  });

  it('returns verified success without creating another Stripe Session for a paid order', async () => {
    createCheckoutSession.mockResolvedValue({
      sessionId: 'cs_paid_original',
      url: 'https://checkout.test/original',
    });

    const first = await createCheckoutOrder(checkout);
    const [order] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));
    await db.update(orders).set({ paymentStatus: 'PAID', stripeCheckoutSessionId: 'cs_expired' }).where(eq(orders.id, order.id));
    retrieveReusableCheckoutSession.mockResolvedValue(null);

    const resumed = await createCheckoutOrder(checkout);

    expect(resumed.url).toMatch(/^\/checkout\/success\?order=SV-[^&]+&token=[A-Za-z0-9_-]+$/);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('does not create a replacement when Stripe completed payment before the webhook arrived', async () => {
    createCheckoutSession.mockResolvedValue({
      sessionId: 'cs_complete_original',
      url: 'https://checkout.test/complete-original',
    });

    const first = await createCheckoutOrder(checkout);
    const [order] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));
    await db
      .update(orders)
      .set({ stripeCheckoutSessionId: 'cs_complete_original' })
      .where(eq(orders.id, order.id));
    retrieveReusableCheckoutSession.mockResolvedValue({
      state: 'complete',
      sessionId: 'cs_complete_original',
      paymentStatus: 'paid',
    });

    const resumed = await createCheckoutOrder(checkout);
    const [afterRetry] = await db.select().from(orders).where(eq(orders.id, order.id));

    expect(resumed.url).toMatch(/^\/checkout\/success\?order=SV-[^&]+&token=[A-Za-z0-9_-]+$/);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(afterRetry.stripeCheckoutSessionId).toBe('cs_complete_original');
  });

  it('allows exactly one replacement for an expired Stripe Session', async () => {
    createCheckoutSession
      .mockResolvedValueOnce({ sessionId: 'cs_expired_original', url: 'https://checkout.test/expired-original' })
      .mockResolvedValueOnce({ sessionId: 'cs_expired_replacement', url: 'https://checkout.test/expired-replacement' });

    const first = await createCheckoutOrder(checkout);
    const [order] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));
    retrieveReusableCheckoutSession.mockResolvedValue({
      state: 'expired',
      sessionId: 'cs_expired_original',
    });

    const resumed = await createCheckoutOrder(checkout);
    const [afterRetry] = await db.select().from(orders).where(eq(orders.id, order.id));

    expect(resumed.url).toBe('https://checkout.test/expired-replacement');
    expect(createCheckoutSession).toHaveBeenCalledTimes(2);
    expect(afterRetry.stripeCheckoutSessionId).toBe('cs_expired_replacement');
  });

  it('keeps repeated same-key cancel/retry attempts on one order', async () => {
    createCheckoutSession
      .mockResolvedValueOnce({ sessionId: 'cs_cancel_1', url: 'https://checkout.test/cancel-1' })
      .mockResolvedValueOnce({ sessionId: 'cs_cancel_2', url: 'https://checkout.test/cancel-2' })
      .mockResolvedValueOnce({ sessionId: 'cs_cancel_3', url: 'https://checkout.test/cancel-3' });
    retrieveReusableCheckoutSession.mockResolvedValue(null);

    const first = await createCheckoutOrder(checkout);
    await createCheckoutOrder(checkout);
    await createCheckoutOrder(checkout);

    const [{ count: total }] = await db.select({ count: count() }).from(orders);
    expect(total).toBe(1);
    expect(first.publicCode).toMatch(/^SV-/);
  });
});

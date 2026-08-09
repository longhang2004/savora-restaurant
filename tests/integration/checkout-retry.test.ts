import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb, seedMenuFixtures, IDS } from './helpers';
import { menuItems, orderItems, orders } from '@/lib/db/schema';

const createPayOSPaymentLink = vi.fn();
const retrievePayOSPaymentLink = vi.fn();
const retrievePayOSPaymentLinkByOrderCode = vi.fn();
let nextPayOSOrderCode = 1_234_567_890;
const generatePayOSOrderCode = vi.fn(() => nextPayOSOrderCode++);

vi.mock('@/features/payments/payos', () => ({
  payosConfigured: vi.fn(() => true),
  createPayOSPaymentLink,
  retrievePayOSPaymentLink,
  retrievePayOSPaymentLinkByOrderCode,
  generatePayOSOrderCode,
  payOSCheckoutUrl: (paymentLinkId: string) => `https://pay.payos.vn/web/${paymentLinkId}`,
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
  nextPayOSOrderCode = 1_234_567_890;
  generatePayOSOrderCode.mockClear();
  await db.update(menuItems).set({ priceCents: 1_100_000, isAvailable: true });
  createPayOSPaymentLink.mockReset();
  retrievePayOSPaymentLink.mockReset();
  retrievePayOSPaymentLinkByOrderCode.mockReset();
});

describe('PayOS checkout retry', () => {
  it('persists the PayOS payment link for a newly created order', async () => {
    createPayOSPaymentLink.mockResolvedValue({
      paymentLinkId: 'payos_retry_success',
      checkoutUrl: 'https://pay.payos.vn/web/payos_retry_success',
    });

    const result = await createCheckoutOrder(checkout);
    expect(result.mode).toBe('payos');
    expect(result.url).toBe('https://pay.payos.vn/web/payos_retry_success');

    const [order] = await db.select().from(orders).where(eq(orders.publicCode, result.publicCode));
    expect(order.payosOrderCode).toBe(1_234_567_890);
    expect(order.payosPaymentLinkId).toBe('payos_retry_success');
  });

  it('lets only the request that reserved an attempt create its PayOS link', async () => {
    let resolvePaymentLink!: (value: { paymentLinkId: string; checkoutUrl: string }) => void;
    let signalPaymentCreate!: () => void;
    const paymentCreateStarted = new Promise<void>((resolve) => { signalPaymentCreate = resolve; });
    createPayOSPaymentLink.mockImplementation(
      () => {
        signalPaymentCreate();
        return new Promise((resolve) => { resolvePaymentLink = resolve; });
      },
    );
    retrievePayOSPaymentLinkByOrderCode.mockResolvedValue({
      state: 'pending',
      paymentLinkId: 'payos_race',
    });

    const first = createCheckoutOrder(checkout);
    await paymentCreateStarted;
    const second = createCheckoutOrder(checkout);
    resolvePaymentLink({ paymentLinkId: 'payos_race', checkoutUrl: 'https://pay.payos.vn/web/payos_race' });

    await Promise.all([first, second]);
    expect(createPayOSPaymentLink).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted snapshot and reuses a pending link after menu prices change', async () => {
    createPayOSPaymentLink.mockResolvedValue({
      paymentLinkId: 'payos_retry_price',
      checkoutUrl: 'https://pay.payos.vn/web/payos_retry_price',
    });
    const first = await createCheckoutOrder(checkout);
    await db.update(menuItems).set({ priceCents: 1_180_000 }).where(eq(menuItems.id, IDS.pho));
    retrievePayOSPaymentLink.mockResolvedValue({ state: 'pending', paymentLinkId: 'payos_retry_price' });

    const resumed = await createCheckoutOrder(checkout);
    const firstAttempt = createPayOSPaymentLink.mock.calls[0][0];
    const [snapshot] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, (await db.select().from(orders).where(eq(orders.publicCode, first.publicCode)))[0].id));
    const [order] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));

    expect(resumed.url).toBe('https://pay.payos.vn/web/payos_retry_price');
    expect(order.totalCents).toBe(1_155_000);
    expect(snapshot.unitPriceCents).toBe(1_100_000);
    expect(firstAttempt.lines[0].unitPriceCents).toBe(1_100_000);
    expect(createPayOSPaymentLink).toHaveBeenCalledTimes(1);
  });

  it('does not create a replacement when PayOS reports PAID before the webhook arrives', async () => {
    createPayOSPaymentLink.mockResolvedValue({
      paymentLinkId: 'payos_paid_original',
      checkoutUrl: 'https://pay.payos.vn/web/payos_paid_original',
    });
    const first = await createCheckoutOrder(checkout);
    retrievePayOSPaymentLink.mockResolvedValue({ state: 'paid', paymentLinkId: 'payos_paid_original' });

    const resumed = await createCheckoutOrder(checkout);
    const [afterRetry] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));

    expect(resumed.url).toMatch(/^\/checkout\/success\?order=SV-[^&]+&token=[A-Za-z0-9_-]+$/);
    expect(afterRetry.paymentStatus).toBe('UNPAID');
    expect(afterRetry.payosPaymentLinkId).toBe('payos_paid_original');
    expect(createPayOSPaymentLink).toHaveBeenCalledTimes(1);
  });

  it('creates exactly one replacement only after PayOS reports EXPIRED', async () => {
    createPayOSPaymentLink
      .mockResolvedValueOnce({ paymentLinkId: 'payos_expired_original', checkoutUrl: 'https://pay.payos.vn/web/original' })
      .mockResolvedValueOnce({ paymentLinkId: 'payos_expired_replacement', checkoutUrl: 'https://pay.payos.vn/web/replacement' });
    const first = await createCheckoutOrder(checkout);
    retrievePayOSPaymentLink.mockResolvedValue({ state: 'replaceable', paymentLinkId: 'payos_expired_original' });

    const resumed = await createCheckoutOrder(checkout);
    const [afterRetry] = await db.select().from(orders).where(eq(orders.publicCode, first.publicCode));

    expect(resumed.url).toBe('https://pay.payos.vn/web/replacement');
    expect(createPayOSPaymentLink).toHaveBeenCalledTimes(2);
    expect(afterRetry.payosPaymentLinkId).toBe('payos_expired_replacement');
    expect(afterRetry.payosOrderCode).toBe(1_234_567_891);
  });

  it('keeps repeated cancel/retry requests on one pending payment link and one order', async () => {
    createPayOSPaymentLink.mockResolvedValue({
      paymentLinkId: 'payos_pending',
      checkoutUrl: 'https://pay.payos.vn/web/payos_pending',
    });
    retrievePayOSPaymentLink.mockResolvedValue({ state: 'pending', paymentLinkId: 'payos_pending' });

    await createCheckoutOrder(checkout);
    await createCheckoutOrder(checkout);
    await createCheckoutOrder(checkout);

    const [{ count: total }] = await db.select({ count: count() }).from(orders);
    expect(total).toBe(1);
    expect(createPayOSPaymentLink).toHaveBeenCalledTimes(1);
  });
});

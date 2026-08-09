import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb } from './helpers';
import { orders, payments, payosWebhookEvents, orderItems, orderItemModifiers } from '@/lib/db/schema';
import { markOrderPaid } from '@/features/payments/service';
import { processPayOSWebhook } from '@/features/payments/payos-webhook';
import { POST as webhookHandler } from '@/app/api/webhooks/payos/route';
import { ErrorCodes } from '@/lib/errors';

const { db } = createTestDb();
const CHECKSUM_KEY = 'payos_checksum_test_1234567890';
type PayOSWebhookData = Parameters<typeof processPayOSWebhook>[0];

beforeAll(async () => {
  await resetDb(db);
});

beforeEach(async () => {
  await db.delete(payosWebhookEvents);
  await db.delete(payments);
  await db.delete(orderItemModifiers);
  await db.delete(orderItems);
  await db.delete(orders);
  process.env.PAYOS_CLIENT_ID = 'payos_client_test';
  process.env.PAYOS_API_KEY = 'payos_api_test';
  process.env.PAYOS_CHECKSUM_KEY = CHECKSUM_KEY;
});

async function insertPendingOrder(publicCode = 'SV-TEST-001') {
  const [order] = await db
    .insert(orders)
    .values({
      publicCode,
      customerName: 'Payment Guest',
      customerEmail: 'payment@test.dev',
      customerPhone: '+84900000002',
      fulfillmentType: 'pickup',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      currency: 'VND',
      subtotalCents: 500_000,
      deliveryFeeCents: 0,
      taxCents: 25_000,
      totalCents: 525_000,
      checkoutKey: `ck_payment_${publicCode.toLowerCase()}`,
      payosOrderCode: 1_234_567_890,
      payosPaymentLinkId: `payos_${publicCode.toLowerCase()}`,
      payosCheckoutUrl: `https://pay.payos.vn/web/payos_${publicCode.toLowerCase()}`,
    })
    .returning();
  return order;
}

function webhookData(order: { totalCents: number; payosOrderCode: number | null; payosPaymentLinkId: string | null }, overrides: Record<string, unknown> = {}) {
  return {
    orderCode: order.payosOrderCode!,
    amount: order.totalCents,
    description: 'Savora order',
    accountNumber: '12345678',
    reference: 'TF230204212323',
    transactionDateTime: '2026-08-08 12:00:00',
    currency: 'VND',
    paymentLinkId: order.payosPaymentLinkId!,
    code: '00',
    desc: 'Success',
    ...overrides,
  };
}

function signData(data: Record<string, unknown>) {
  const query = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined)
    .map((key) => `${key}=${data[key] ?? ''}`)
    .join('&');
  return createHmac('sha256', CHECKSUM_KEY).update(query).digest('hex');
}

describe('markOrderPaid (idempotent payment confirmation)', () => {
  it('marks an unpaid PENDING order paid and moves it to NEW', async () => {
    const order = await insertPendingOrder();
    const result = await markOrderPaid(order.id, { payosPaymentLinkId: order.payosPaymentLinkId });
    expect(result).toBe('paid');

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
    expect(row.status).toBe('NEW');

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id));
    expect(payment.status).toBe('paid');
    expect(payment.amountCents).toBe(525_000);
    expect(payment.payosPaymentLinkId).toBe(order.payosPaymentLinkId);
  });

  it('is a safe no-op when called twice', async () => {
    const order = await insertPendingOrder();
    await markOrderPaid(order.id, { payosPaymentLinkId: order.payosPaymentLinkId });
    const again = await markOrderPaid(order.id, { payosPaymentLinkId: order.payosPaymentLinkId });
    expect(again).toBe('already_paid');

    const [{ count: total }] = await db.select({ count: count() }).from(payments);
    expect(total).toBe(1);
  });
});

describe('PayOS webhook processing', () => {
  it('confirms a valid, verified payment notification', async () => {
    const order = await insertPendingOrder('SV-TEST-002');
    const result = await processPayOSWebhook(webhookData(order) as PayOSWebhookData);
    expect(result.handled).toBe(true);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
    expect(row.status).toBe('NEW');
  });

  it('deduplicates a replayed bank reference', async () => {
    const order = await insertPendingOrder('SV-TEST-003');
    const data = webhookData(order);
    await processPayOSWebhook(data as PayOSWebhookData);
    const replay = await processPayOSWebhook(data as PayOSWebhookData);
    expect(replay.duplicate).toBe(true);

    const [{ count: total }] = await db.select({ count: count() }).from(payments);
    expect(total).toBe(1);
  });

  it('verifies the official SDK checksum end-to-end through the route', async () => {
    const order = await insertPendingOrder('SV-TEST-004');
    const data = webhookData(order);
    const payload = { code: '00', desc: 'success', success: true, data, signature: signData(data) };
    const response = await webhookHandler(
      new Request('http://localhost/api/webhooks/payos', { method: 'POST', body: JSON.stringify(payload) }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).handled).toBe(true);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
  });

  it('rejects a forged checksum without mutating state', async () => {
    const order = await insertPendingOrder('SV-TEST-005');
    const data = webhookData(order);
    const payload = { code: '00', desc: 'success', success: true, data, signature: 'forged' };
    const response = await webhookHandler(
      new Request('http://localhost/api/webhooks/payos', { method: 'POST', body: JSON.stringify(payload) }),
    );

    expect(response.status).toBe(400);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('rejects an amount mismatch and leaves no consumed event record', async () => {
    const order = await insertPendingOrder('SV-TEST-006');
    const data = webhookData(order, { amount: order.totalCents - 1, reference: 'REF_AMOUNT_MISMATCH' });

    await expect(processPayOSWebhook(data as PayOSWebhookData)).rejects.toMatchObject({
      code: ErrorCodes.PAYMENT_NOT_CONFIRMED,
    });
    const [event] = await db
      .select()
      .from(payosWebhookEvents)
      .where(eq(payosWebhookEvents.eventKey, `${data.paymentLinkId}:${data.reference}`));
    expect(event).toBeUndefined();
  });

  it('rejects a payment link from a replaced attempt', async () => {
    const order = await insertPendingOrder('SV-TEST-007');
    const data = webhookData(order, { paymentLinkId: 'payos_old_replaced', reference: 'REF_REPLACED' });

    await expect(processPayOSWebhook(data as PayOSWebhookData)).rejects.toMatchObject({
      code: ErrorCodes.PAYMENT_NOT_CONFIRMED,
    });
  });

  it('returns 503 when PayOS credentials are absent', async () => {
    delete process.env.PAYOS_CLIENT_ID;
    delete process.env.PAYOS_API_KEY;
    delete process.env.PAYOS_CHECKSUM_KEY;
    const response = await webhookHandler(
      new Request('http://localhost/api/webhooks/payos', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(503);
  });
});

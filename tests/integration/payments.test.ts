/**
 * Stripe payment lifecycle tests.
 *
 * - markOrderPaid is the single idempotent source of truth.
 * - Webhook processing covers signature verification (real crypto via
 *   stripe.webhooks.generateTestHeaderString — no network), duplicate
 *   events, unsupported events, and the route handler status codes.
 * - Reaching a success URL never marks an order paid (covered implicitly:
 *   payment state changes only through markOrderPaid).
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb } from './helpers';
import { orders, payments, stripeWebhookEvents, orderItems, orderItemModifiers } from '@/lib/db/schema';
import { markOrderPaid } from '@/features/payments/service';
import { processStripeEvent } from '@/features/payments/webhook';
import { POST as webhookHandler } from '@/app/api/webhooks/stripe/route';
import { ErrorCodes } from '@/lib/errors';

const { db } = createTestDb();
const WEBHOOK_SECRET = 'whsec_test_secret_1234567890';

beforeAll(async () => {
  await resetDb(db);
});

beforeEach(async () => {
  await db.delete(stripeWebhookEvents);
  await db.delete(payments);
  await db.delete(orderItemModifiers);
  await db.delete(orderItems);
  await db.delete(orders);
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
      currency: 'USD',
      subtotalCents: 5000,
      deliveryFeeCents: 0,
      taxCents: 250,
      totalCents: 5250,
      checkoutKey: `ck_payment_${publicCode.toLowerCase()}`,
    })
    .returning();
  return order;
}

describe('markOrderPaid (idempotent payment confirmation)', () => {
  it('marks an unpaid PENDING order paid and moves it to NEW', async () => {
    const order = await insertPendingOrder();
    const result = await markOrderPaid(order.id, 'cs_test_1');
    expect(result).toBe('paid');

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
    expect(row.status).toBe('NEW');

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id));
    expect(payment.status).toBe('paid');
    expect(payment.amountCents).toBe(5250);
  });

  it('is a safe no-op when called twice (webhook replay / double-click)', async () => {
    const order = await insertPendingOrder();
    await markOrderPaid(order.id, 'cs_test_2');
    const again = await markOrderPaid(order.id, 'cs_test_2');
    expect(again).toBe('already_paid');

    const [{ count: total }] = await db.select({ count: count() }).from(payments);
    expect(total).toBe(1); // no duplicate payment rows
  });

  it('does not touch already-paid orders in a later state', async () => {
    const order = await insertPendingOrder();
    await markOrderPaid(order.id, 'cs_test_3');
    // Fulfillment progressed to PREPARING; a late webhook replay must not regress it.
    await db.update(orders).set({ status: 'PREPARING' }).where(eq(orders.id, order.id));
    const again = await markOrderPaid(order.id, 'cs_test_3');
    expect(again).toBe('already_paid');

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.status).toBe('PREPARING');
    expect(row.paymentStatus).toBe('PAID');
  });
});

describe('webhook processing (processStripeEvent)', () => {
  function checkoutEvent(
    order: { id: string; publicCode: string; totalCents: number; currency: string; customerEmail: string },
    eventId = 'evt_test_1',
    sessionId = 'cs_test_w1',
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: eventId,
      object: 'event',
      api_version: '2025-02-24.acacia',
      created: 1_800_000_000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          metadata: { orderId: order.id, publicCode: order.publicCode },
          client_reference_id: order.publicCode,
          customer_email: order.customerEmail,
          payment_status: 'paid',
          amount_total: order.totalCents,
          currency: order.currency.toLowerCase(),
          status: 'complete',
          ...overrides,
        },
      },
    } as unknown as Stripe.Event;
  }

  it('confirms payment for a valid checkout.session.completed event', async () => {
    const order = await insertPendingOrder('SV-TEST-002');
    const result = await processStripeEvent(checkoutEvent(order));
    expect(result.handled).toBe(true);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
    expect(row.status).toBe('NEW');
  });

  it('ignores duplicate event delivery (replay is a no-op)', async () => {
    const order = await insertPendingOrder('SV-TEST-003');
    const event = checkoutEvent(order, 'evt_test_dup', 'cs_test_dup');
    await processStripeEvent(event);
    const replay = await processStripeEvent(event);
    expect(replay.duplicate).toBe(true);

    const [{ count: total }] = await db.select({ count: count() }).from(payments);
    expect(total).toBe(1);
  });

  it('safely ignores unsupported event types', async () => {
    const order = await insertPendingOrder('SV-TEST-004');
    const result = await processStripeEvent({
      id: 'evt_test_ignore',
      type: 'payment_intent.succeeded',
      data: { object: {} },
    } as unknown as Stripe.Event);
    expect(result.handled).toBe(false);

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('verifies real Stripe signatures end-to-end through the route handler', async () => {
    const order = await insertPendingOrder('SV-TEST-005');
    const event = checkoutEvent(order, 'evt_test_signed', 'cs_test_signed');

    const payload = JSON.stringify(event);
    // generateTestHeaderString is the official Stripe test helper.
    const header = new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': header },
      body: payload,
    });
    // Route reads STRIPE_WEBHOOK_SECRET from env at call time.
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    try {
      const response = await webhookHandler(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.handled).toBe(true);
    } finally {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('PAID');
  });

  it('rejects an invalid signature with 400 and does not mutate state', async () => {
    const order = await insertPendingOrder('SV-TEST-006');
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    try {
      const request = new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=forged' },
        body: JSON.stringify(checkoutEvent(order, 'evt_test_forged')),
      });
      const response = await webhookHandler(request);
      expect(response.status).toBe(400);
    } finally {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('does not mark an unpaid completed session as paid', async () => {
    const order = await insertPendingOrder('SV-TEST-007');
    const result = await processStripeEvent(
      checkoutEvent(order, 'evt_test_unpaid', 'cs_test_unpaid', { payment_status: 'unpaid' }),
    );

    expect(result.handled).toBe(true);
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('rejects a session whose amount does not match the order', async () => {
    const order = await insertPendingOrder('SV-TEST-008');

    await expect(
      processStripeEvent(
        checkoutEvent(order, 'evt_test_amount_mismatch', 'cs_test_amount_mismatch', {
          amount_total: order.totalCents - 1,
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_NOT_CONFIRMED });

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
    const [event] = await db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, 'evt_test_amount_mismatch'));
    expect(event).toBeUndefined();
  });

  it('rejects a session whose currency does not match the order', async () => {
    const order = await insertPendingOrder('SV-TEST-008B');

    await expect(
      processStripeEvent(
        checkoutEvent(order, 'evt_test_currency_mismatch', 'cs_test_currency_mismatch', {
          currency: 'eur',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_NOT_CONFIRMED });

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('rejects a session whose public identity does not match the order', async () => {
    const order = await insertPendingOrder('SV-TEST-009');

    await expect(
      processStripeEvent(
        checkoutEvent(order, 'evt_test_identity_mismatch', 'cs_test_identity_mismatch', {
          client_reference_id: 'SV-WRONG-CODE',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.PAYMENT_NOT_CONFIRMED });

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(row.paymentStatus).toBe('UNPAID');
  });

  it('returns 503 when the webhook secret is not configured', async () => {
    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=x' },
      body: '{}',
    });
    const response = await webhookHandler(request);
    expect(response.status).toBe(503);
  });
});

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, resetDb } from './helpers';
import { findCheckoutResume, isPaymentRetryableOrder } from '@/features/checkout/resume';
import { createOrderAccessToken } from '@/features/checkout/access';
import { orders } from '@/lib/db/schema';

const { db } = createTestDb();

beforeAll(async () => {
  await resetDb(db);
});

beforeEach(async () => {
  await db.delete(orders);
});

async function insertOrder(
  publicCode = 'SV-RESUME-001',
  status: 'PENDING' | 'COMPLETED' = 'PENDING',
  paymentStatus: 'UNPAID' | 'PAID' = 'UNPAID',
) {
  const [order] = await db
    .insert(orders)
    .values({
      publicCode,
      customerName: 'Resume Guest',
      customerEmail: 'resume@example.com',
      customerPhone: '+84900000001',
      fulfillmentType: 'pickup',
      status,
      paymentStatus,
      currency: 'USD',
      subtotalCents: 1000,
      deliveryFeeCents: 0,
      taxCents: 50,
      totalCents: 1050,
      checkoutKey: `ck_${publicCode.toLowerCase()}`,
    })
    .returning();
  return order;
}

describe('secure checkout cancellation resume', () => {
  it('returns the same order for a valid token', async () => {
    const order = await insertOrder();
    const token = createOrderAccessToken(order.id, order.publicCode);

    const resumed = await findCheckoutResume(order.publicCode, token);

    expect(resumed?.id).toBe(order.id);
    expect(isPaymentRetryableOrder(resumed!)).toBe(true);
  });

  it('rejects missing, invalid, and cross-order tokens without returning an order', async () => {
    const order = await insertOrder();
    const token = createOrderAccessToken(order.id, order.publicCode);

    await expect(findCheckoutResume(order.publicCode, undefined)).resolves.toBeNull();
    await expect(findCheckoutResume(order.publicCode, `${token}tampered`)).resolves.toBeNull();
    await expect(findCheckoutResume('SV-OTHER-001', token)).resolves.toBeNull();
  });

  it('does not make paid or completed orders eligible for payment retry', async () => {
    const paid = await insertOrder('SV-RESUME-002', 'PENDING', 'PAID');
    const completed = await insertOrder('SV-RESUME-003', 'COMPLETED', 'UNPAID');

    expect(isPaymentRetryableOrder(paid)).toBe(false);
    expect(isPaymentRetryableOrder(completed)).toBe(false);
  });
});

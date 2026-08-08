import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, resetDb } from './helpers';
import { getDashboardMetrics } from '@/features/admin/queries';
import { orders, payments } from '@/lib/db/schema';

const { db } = createTestDb();
const NOW = new Date('2099-01-05T05:00:00.000Z'); // 12:00 local time

const baseOrder = {
  customerName: 'Metrics Guest',
  customerEmail: 'metrics@example.com',
  customerPhone: '+84900000000',
  fulfillmentType: 'pickup' as const,
  status: 'NEW' as const,
  paymentStatus: 'PAID' as const,
  currency: 'USD',
  subtotalCents: 1000,
  deliveryFeeCents: 0,
  taxCents: 50,
  totalCents: 1050,
};

async function insertPaidOrder(
  publicCode: string,
  createdAt: Date,
  paymentCreatedAt: Date,
  totalCents = 1050,
) {
  const [order] = await db
    .insert(orders)
    .values({
      ...baseOrder,
      publicCode,
      checkoutKey: `ck_${publicCode}`,
      createdAt,
      totalCents,
      subtotalCents: totalCents,
    })
    .returning();

  await db.insert(payments).values({
    orderId: order.id,
    stripeSessionId: `cs_${publicCode}`,
    amountCents: totalCents,
    currency: 'USD',
    status: 'paid',
    createdAt: paymentCreatedAt,
  });

  return order;
}

beforeAll(async () => {
  await resetDb(db);
});

beforeEach(async () => {
  await db.delete(payments);
  await db.delete(orders);
});

describe('dashboard payment metrics', () => {
  it('uses restaurant-local payment time and today-only average order value', async () => {
    await insertPaidOrder(
      'SV-METRIC-YESTERDAY-CREATED',
      new Date('2099-01-04T10:00:00.000Z'),
      new Date('2099-01-05T01:00:00.000Z'),
      1200,
    );
    await insertPaidOrder(
      'SV-METRIC-TOMORROW-PAID',
      new Date('2099-01-05T02:00:00.000Z'),
      new Date('2099-01-06T01:00:00.000Z'),
      2400,
    );
    const [unpaid] = await db
      .insert(orders)
      .values({
        ...baseOrder,
        publicCode: 'SV-METRIC-UNPAID',
        checkoutKey: 'ck_SV-METRIC-UNPAID',
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        createdAt: new Date('2099-01-05T02:00:00.000Z'),
      })
      .returning();

    const metrics = await getDashboardMetrics(NOW);

    expect(metrics.revenueTodayCents).toBe(1200);
    expect(metrics.paidOrdersToday).toBe(1);
    expect(metrics.averageOrderValueCents).toBe(1200);

    const [unpaidRow] = await db.select().from(orders).where(eq(orders.id, unpaid.id));
    expect(unpaidRow.paymentStatus).toBe('UNPAID');
  });

  it('includes the local midnight start and excludes the exclusive next-day boundary', async () => {
    await insertPaidOrder(
      'SV-METRIC-MIDNIGHT-IN',
      new Date('2099-01-04T12:00:00.000Z'),
      new Date('2099-01-04T17:00:00.000Z'),
      700,
    );
    await insertPaidOrder(
      'SV-METRIC-MIDNIGHT-OUT',
      new Date('2099-01-05T12:00:00.000Z'),
      new Date('2099-01-05T17:00:00.000Z'),
      900,
    );

    const metrics = await getDashboardMetrics(NOW);

    expect(metrics.revenueTodayCents).toBe(700);
    expect(metrics.paidOrdersToday).toBe(1);
  });
});

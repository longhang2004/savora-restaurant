/** Secure server-side lookup for a payment cancellation return. */
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders, type Order } from '@/lib/db/schema';
import { verifyOrderAccessToken } from './access';

const PAYMENT_RETRYABLE_STATUSES: Order['status'][] = [
  'PENDING',
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
];

export async function findCheckoutResume(
  publicCode: string | undefined,
  accessToken: string | undefined,
): Promise<Order | null> {
  if (!publicCode || !accessToken) return null;

  const [order] = await db.select().from(orders).where(eq(orders.publicCode, publicCode));
  if (!order || !verifyOrderAccessToken(order.id, order.publicCode, accessToken)) return null;
  return order;
}

export function isPaymentRetryableOrder(order: Order): boolean {
  return order.paymentStatus === 'UNPAID' && PAYMENT_RETRYABLE_STATUSES.includes(order.status);
}

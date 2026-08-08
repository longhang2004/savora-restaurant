/**
 * Stripe webhook processing.
 *
 * - Rejects unknown/unsupported events by ignoring them (HTTP 200).
 * - Deduplicates via the stripe_webhook_events unique primary key; a
 *   replayed event becomes a safe no-op.
 * - Only checkout.session.completed drives payment confirmation.
 * - If processing fails, the event record is removed so a Stripe retry
 *   can reprocess it (a recorded-but-failed event would swallow retries).
 */
import 'server-only';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders, stripeWebhookEvents } from '@/lib/db/schema';
import { AppError, ErrorCodes, isUniqueViolation } from '@/lib/errors';
import { markOrderPaid } from './service';

export interface WebhookProcessResult {
  handled: boolean;
  duplicate?: boolean;
}

export async function processStripeEvent(event: Stripe.Event): Promise<WebhookProcessResult> {
  if (event.type !== 'checkout.session.completed') {
    return { handled: false };
  }

  try {
    await db.insert(stripeWebhookEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Already processed — replay is a no-op.
      return { handled: true, duplicate: true };
    }
    throw err;
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const { order, paymentConfirmed } = await validateCheckoutSession(session);
    if (paymentConfirmed) {
      await markOrderPaid(order.id, session.id);
    }
    return { handled: true };
  } catch (err) {
    // Let Stripe retry: drop the recorded event so it can be reprocessed.
    await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.stripeEventId, event.id)).catch(() => {});
    throw err;
  }
}

async function validateCheckoutSession(session: Stripe.Checkout.Session): Promise<{
  order: typeof orders.$inferSelect;
  paymentConfirmed: boolean;
}> {
  const orderId = session.metadata?.orderId;
  const publicCode = session.metadata?.publicCode;

  if (!orderId || !publicCode || session.client_reference_id !== publicCode) {
    throw paymentNotConfirmed('Checkout Session identity does not match an order.');
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.publicCode !== publicCode) {
    throw paymentNotConfirmed('Checkout order identity could not be verified.');
  }

  if (
    order.stripeCheckoutSessionId &&
    order.stripeCheckoutSessionId !== session.id
  ) {
    throw paymentNotConfirmed('Checkout Session does not match the order payment attempt.');
  }

  if (
    session.customer_email &&
    session.customer_email.toLowerCase() !== order.customerEmail.toLowerCase()
  ) {
    throw paymentNotConfirmed('Checkout customer identity does not match the order.');
  }

  if (session.payment_status !== 'paid') {
    return { order, paymentConfirmed: false };
  }

  if (
    session.amount_total !== order.totalCents ||
    session.currency?.toUpperCase() !== order.currency.toUpperCase()
  ) {
    throw paymentNotConfirmed('Checkout amount or currency does not match the order.');
  }

  return { order, paymentConfirmed: true };
}

function paymentNotConfirmed(message: string): AppError {
  return new AppError(ErrorCodes.PAYMENT_NOT_CONFIRMED, message, { status: 400 });
}

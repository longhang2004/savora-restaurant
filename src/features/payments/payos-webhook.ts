/**
 * PayOS webhook processing.
 *
 * The route verifies the checksum with the official SDK before this module is
 * called. This layer then verifies the provider attempt against the immutable
 * Savora order and deduplicates bank-transfer references.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import type { WebhookData } from '@payos/node/lib/resources/webhooks/webhook';
import { db } from '@/lib/db/client';
import { orders, payosWebhookEvents } from '@/lib/db/schema';
import { AppError, ErrorCodes, isUniqueViolation } from '@/lib/errors';
import { markOrderPaid } from './service';

export interface PayOSWebhookProcessResult {
  handled: boolean;
  duplicate?: boolean;
}

export async function processPayOSWebhook(data: WebhookData): Promise<PayOSWebhookProcessResult> {
  if (data.code !== '00') return { handled: false };

  const eventKey = `${data.paymentLinkId}:${data.reference}`;
  try {
    await db.insert(payosWebhookEvents).values({
      eventKey,
      paymentLinkId: data.paymentLinkId,
      reference: data.reference,
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { handled: true, duplicate: true };
    throw err;
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.payosOrderCode, data.orderCode));
    if (!order) throw paymentNotConfirmed('PayOS order code does not match an order.');
    if (order.payosPaymentLinkId !== data.paymentLinkId) {
      throw paymentNotConfirmed('PayOS payment link does not match the active payment attempt.');
    }
    if (data.amount !== order.totalCents || data.currency.toUpperCase() !== order.currency.toUpperCase()) {
      throw paymentNotConfirmed('PayOS amount or currency does not match the order.');
    }

    await markOrderPaid(order.id, { payosPaymentLinkId: data.paymentLinkId });
    return { handled: true };
  } catch (err) {
    // A failed validation must remain retryable after a corrected deployment
    // or a transient database issue; never permanently swallow the webhook.
    await db.delete(payosWebhookEvents).where(eq(payosWebhookEvents.eventKey, eventKey)).catch(() => {});
    throw err;
  }
}

function paymentNotConfirmed(message: string): AppError {
  return new AppError(ErrorCodes.PAYMENT_NOT_CONFIRMED, message, { status: 400 });
}

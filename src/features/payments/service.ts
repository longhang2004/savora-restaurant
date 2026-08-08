/**
 * Payment confirmation — the single source of truth for "paid".
 *
 * Both the Stripe webhook and the DEMO_MODE sandbox funnel through
 * markOrderPaid, which is idempotent: the UNPAID→PAID transition is
 * guarded atomically, so duplicate webhooks / double-clicks are no-ops.
 * Reaching /checkout/success never marks anything paid.
 */
import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orderItemModifiers, orderItems, orders, payments } from '@/lib/db/schema';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import { formatCents } from '@/lib/money';
import { isUniqueViolation } from '@/lib/errors';
import { sendEmail } from '@/lib/email/resend';
import { orderConfirmationHtml } from '@/lib/email/templates';
import { escapeHtml } from '@/lib/email/html';

export async function markOrderPaid(
  orderId: string,
  stripeSessionId: string | null,
): Promise<'paid' | 'already_paid'> {
  const result = await db.transaction(async (tx) => {
    // Atomic guard: only a PENDING/UNPAID order can become PAID.
    const updated = await tx
      .update(orders)
      .set({
        paymentStatus: 'PAID',
        stripeCheckoutSessionId: stripeSessionId ?? undefined,
        status: sql`CASE WHEN ${orders.status} = 'PENDING' THEN 'NEW' ELSE ${orders.status} END`,
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.paymentStatus, 'UNPAID'),
          inArray(orders.status, ['PENDING', 'NEW', 'ACCEPTED', 'PREPARING', 'READY']),
        ),
      )
      .returning();

    if (updated.length === 0) return 'already_paid' as const;

    const order = updated[0];
    try {
      await tx.insert(payments).values({
        orderId: order.id,
        stripeSessionId: stripeSessionId ?? undefined,
        amountCents: order.totalCents,
        currency: order.currency,
        status: 'paid',
      });
    } catch (err) {
      // Duplicate payment row (e.g. webhook replayed after commit) — ignore.
      if (!isUniqueViolation(err)) throw err;
    }
    return order;
  });

  if (result === 'already_paid') return result;

  // Best-effort confirmation email after the commit.
  await sendOrderConfirmationEmail(result.id).catch((err) =>
    console.error('[payments] confirmation email failed:', err),
  );
  return 'paid';
}

async function sendOrderConfirmationEmail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const modifiers = await db
    .select()
    .from(orderItemModifiers)
    .where(inArray(orderItemModifiers.orderItemId, items.map((i) => i.id)));

  const itemsHtml = items
    .map((item) => {
      const mods = modifiers
        .filter((m) => m.orderItemId === item.id)
        .map((m) => `+ ${escapeHtml(m.optionName)}`)
        .join('<br/>');
      return `<div style="border-bottom:1px solid rgba(200,155,60,.15);padding:10px 0;">
        <div style="display:flex;justify-content:space-between;font-size:14px;">
          <span style="color:#f7f5f2;">${item.quantity} × ${escapeHtml(item.itemName)}</span>
          <span style="color:#c89b3c;">${formatCents(item.lineTotalCents, order.currency)}</span>
        </div>
        ${mods ? `<div style="font-size:12px;color:#6e6963;margin-top:4px;">${mods}</div>` : ''}
      </div>`;
    })
    .join('');

  const scheduledLabel = order.scheduledFor
    ? `${utcToLocalDate(order.scheduledFor)} at ${utcToLocalTime(order.scheduledFor)}`
    : order.fulfillmentType === 'delivery'
      ? 'as soon as possible'
      : 'as soon as possible';

  await sendEmail({
    to: order.customerEmail,
    subject: `Order Confirmed — ${order.publicCode}`,
    html: orderConfirmationHtml({
      code: order.publicCode,
      name: order.customerName,
      fulfillment: order.fulfillmentType === 'delivery' ? 'delivery' : 'pickup',
      scheduledLabel,
      itemsHtml,
      subtotalCents: order.subtotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      currency: order.currency,
    }),
  });
}

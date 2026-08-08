/**
 * /checkout/success — loads the REAL order state from the database.
 *
 * Reaching this URL never marks an order paid; only the webhook (or the
 * gated demo simulation) updates payment state.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orderItemModifiers, orderItems, orders } from '@/lib/db/schema';
import { formatCents } from '@/lib/money';
import { generatePageMetadata } from '@/lib/metadata';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import { verifyOrderAccessToken } from '@/features/checkout/access';
import ClearCartOnPaid from '@/components/checkout/ClearCartOnPaid';

export const metadata = generatePageMetadata({
  title: 'Order Confirmation',
  description: 'Your Savora order status.',
  path: '/checkout/success',
  noIndex: true,
});

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const { order: publicCode, token } = await searchParams;
  if (!publicCode || !token) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.publicCode, publicCode));
  if (!order || !verifyOrderAccessToken(order.id, order.publicCode, token)) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const modifiers = items.length
    ? await db
        .select()
        .from(orderItemModifiers)
        .where(inArray(orderItemModifiers.orderItemId, items.map((i) => i.id)))
    : [];

  const paid = order.paymentStatus === 'PAID';

  return (
    <div className="container" style={{ maxWidth: '680px', padding: '3rem 1rem 5rem' }}>
      <ClearCartOnPaid paymentStatus={order.paymentStatus} accessVerified />
      <div
        className="glassmorphism"
        style={{ borderRadius: 'var(--radius-lg)', padding: '2.25rem' }}
      >
        <p
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--accent-gold)',
            marginBottom: '0.6rem',
          }}
        >
          Order {order.publicCode}
        </p>
        <h1 className="text-gradient" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '0.75rem' }}>
          {paid ? 'Thank you — payment received' : 'Order received, awaiting payment'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {paid
            ? `Hi ${order.customerName}, the kitchen has your order. We'll text and email you when it's ready.`
            : `Hi ${order.customerName}, your order is pending payment. It will enter the kitchen as soon as payment is confirmed.`}
        </p>

        <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          {items.map((item) => {
            const mods = modifiers.filter((m) => m.orderItemId === item.id);
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                <div>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {item.quantity} × {item.itemName}
                  </span>
                  {mods.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {mods.map((m) => m.optionName).join(', ')}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--accent-gold)' }}>
                  {formatCents(item.lineTotalCents, order.currency)}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
            <span>Subtotal</span>
            <span>{formatCents(order.subtotalCents, order.currency)}</span>
          </div>
          {order.deliveryFeeCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
              <span>Delivery fee</span>
              <span>{formatCents(order.deliveryFeeCents, order.currency)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
            <span>Tax</span>
            <span>{formatCents(order.taxCents, order.currency)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0 0',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            <span>Total {paid ? 'paid' : 'due'}</span>
            <span>{formatCents(order.totalCents, order.currency)}</span>
          </div>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'} ·{' '}
          {order.scheduledFor
            ? `${utcToLocalDate(order.scheduledFor)} at ${utcToLocalTime(order.scheduledFor)}`
            : 'as soon as possible'}
          {order.deliveryAddress ? ` · ${order.deliveryAddress.line1}, ${order.deliveryAddress.district}` : ''}
        </p>

        <Link
          href="/menu"
          style={{
            display: 'inline-block',
            marginTop: '1.75rem',
            padding: '0.7rem 1.6rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-hover))',
            color: '#14110f',
            fontWeight: 700,
          }}
        >
          Back to Menu
        </Link>
      </div>
    </div>
  );
}

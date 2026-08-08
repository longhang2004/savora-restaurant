'use client';

/**
 * Guest checkout form. The cart (ids + quantities + modifier option ids)
 * is sent to the server, which reloads products, validates everything and
 * computes the authoritative totals before creating the Stripe session.
 */
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { restaurantConfig } from '@/config/restaurant';
import { useCart } from '@/components/cart/CartProvider';
import { createCheckoutAction } from '@/features/checkout/actions';
import type { AppErrorShape } from '@/lib/errors';
import styles from './CheckoutForm.module.css';

export interface CheckoutResumeValues {
  checkoutKey: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: 'pickup' | 'delivery';
  scheduledFor: string | null;
  deliveryAddress: {
    line1: string;
    district: string;
    city: string;
    notes?: string;
  } | null;
  customerNotes: string | null;
}

export default function CheckoutForm({
  cancelled,
  resume,
}: {
  cancelled: boolean;
  resume?: CheckoutResumeValues;
}) {
  const router = useRouter();
  const { lines, displaySubtotalCents } = useCart();

  const [name, setName] = useState(resume?.customerName ?? '');
  const [email, setEmail] = useState(resume?.customerEmail ?? '');
  const [phone, setPhone] = useState(resume?.customerPhone ?? '');
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(resume?.fulfillmentType ?? 'pickup');
  const [scheduledFor, setScheduledFor] = useState(resume?.scheduledFor ?? '');
  const [line1, setLine1] = useState(resume?.deliveryAddress?.line1 ?? '');
  const [district, setDistrict] = useState(resume?.deliveryAddress?.district ?? '');
  const [addressNotes, setAddressNotes] = useState(resume?.deliveryAddress?.notes ?? '');
  const [customerNotes, setCustomerNotes] = useState(resume?.customerNotes ?? '');
  const [error, setError] = useState<AppErrorShape | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkoutKey = useMemo(() => resume?.checkoutKey ?? crypto.randomUUID(), [resume?.checkoutKey]);

  const estimatedDeliveryFee = fulfillment === 'delivery' ? restaurantConfig.delivery.feeCents : 0;
  const estimatedTax = Math.round((displaySubtotalCents * restaurantConfig.taxRateBps) / 10_000);
  const estimatedTotal = displaySubtotalCents + estimatedDeliveryFee + estimatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);

    const result = await createCheckoutAction({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      fulfillmentType: fulfillment,
      scheduledFor: scheduledFor || null,
      deliveryAddress:
        fulfillment === 'delivery'
          ? { line1, district, city: 'Ho Chi Minh City', notes: addressNotes.trim() || undefined }
          : null,
      customerNotes: customerNotes || null,
      checkoutKey,
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        modifierOptionIds: line.modifierOptionIds,
        quantity: line.quantity,
        specialInstructions: line.specialInstructions,
      })),
    });

    setSubmitting(false);
    if (result.ok) {
      router.push(result.data.url);
    } else {
      setError(result.error);
    }
  };

  if (lines.length === 0) {
    return (
      <div className={`${styles.card} glassmorphism`}>
        <p className={styles.emptyText}>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} glassmorphism`}>
      {cancelled && (
        <div className={styles.notice} role="status">
          Your payment was cancelled — your cart is still here whenever you are ready.
        </div>
      )}

      <h2 className={styles.sectionTitle}>Contact Details</h2>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>Full Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className={styles.input}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+84 786 907 453"
          required
          className={styles.input}
        />
      </label>

      <h2 className={styles.sectionTitle}>Fulfillment</h2>
      <div className={styles.fulfillmentRow}>
        <button
          type="button"
          className={`${styles.fulfillmentOption} ${fulfillment === 'pickup' ? styles.fulfillmentActive : ''}`}
          onClick={() => setFulfillment('pickup')}
        >
          <strong>Pickup</strong>
          <span>Collect at the restaurant</span>
        </button>
        <button
          type="button"
          className={`${styles.fulfillmentOption} ${fulfillment === 'delivery' ? styles.fulfillmentActive : ''}`}
          onClick={() => setFulfillment('delivery')}
        >
          <strong>Delivery</strong>
          <span>{formatCents(restaurantConfig.delivery.feeCents)} flat fee</span>
        </button>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>
          Scheduled time <em className={styles.optional}>(optional)</em>
        </span>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className={styles.input}
        />
        <span className={styles.optional}>
          Available during lunch and dinner service, up to {restaurantConfig.ordering.maxScheduledDays} days ahead.
        </span>
      </label>

      {fulfillment === 'delivery' && (
        <div className={styles.deliveryBlock}>
          <label className={styles.field}>
            <span className={styles.label}>Street address</span>
            <input
              type="text"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="12 Nguyen Hue"
              required
              className={styles.input}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>District</span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
              className={styles.input}
            >
              <option value="">Choose your district…</option>
              {restaurantConfig.delivery.supportedDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Address notes <em className={styles.optional}>(optional)</em>
            </span>
            <input
              type="text"
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
              placeholder="Building, gate, landmark…"
              className={styles.input}
            />
          </label>
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.label}>
          Order notes <em className={styles.optional}>(optional)</em>
        </span>
        <textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Anything we should know?"
          className={styles.input}
        />
      </label>

      {/* Summary */}
      <div className={styles.summary}>
        <h2 className={styles.sectionTitle}>Order Summary</h2>
        {lines.map((line) => (
          <div key={line.key} className={styles.summaryLine}>
            <span className={styles.summaryQty}>{line.quantity}×</span>
            <span className={styles.summaryName}>
              {line.itemName}
              {line.modifiers.length > 0 && (
                <span className={styles.summaryMods}>
                  {' '}
                  · {line.modifiers.map((m) => m.optionName).join(', ')}
                </span>
              )}
            </span>
            <span className={styles.summaryPrice}>
              {formatCents(line.unitPriceCents * line.quantity)}
            </span>
          </div>
        ))}
        <div className={styles.summaryTotals}>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>{formatCents(displaySubtotalCents)}</span>
          </div>
          {fulfillment === 'delivery' && (
            <div className={styles.summaryRow}>
              <span>Delivery fee</span>
              <span>{formatCents(estimatedDeliveryFee)}</span>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span>Tax (est.)</span>
            <span>{formatCents(estimatedTax)}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>Total</span>
            <span>{formatCents(estimatedTotal)}</span>
          </div>
        </div>
        <p className={styles.authoritativeNote}>
          Final prices, availability and the total are recalculated by our server when you place
          the order.
        </p>
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          <strong>{error.message}</strong>
          {error.fieldErrors &&
            Object.entries(error.fieldErrors).map(([field, msgs]) => (
              <p key={field}>
                {field}: {msgs.join(', ')}
              </p>
            ))}
        </div>
      )}

      <button type="submit" disabled={submitting} className={styles.submitBtn}>
        {submitting ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span>Preparing secure checkout…</span>
          </>
        ) : (
          <span>Continue to Payment</span>
        )}
      </button>
    </form>
  );
}

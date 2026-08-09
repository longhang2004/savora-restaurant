'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Loader2 } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { demoConfirmPaymentAction } from '@/features/checkout/actions';
import { AppErrorShape } from '@/lib/errors';
import styles from './SandboxPage.module.css';

interface SandboxPageProps {
  publicCode: string;
  accessToken: string;
  totals: {
    subtotalCents: number;
    deliveryFeeCents: number;
    taxCents: number;
    totalCents: number;
  };
}

export default function SandboxPage({ publicCode, accessToken, totals }: SandboxPageProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<AppErrorShape | null>(null);

  const simulatePayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await demoConfirmPaymentAction({ publicCode, accessToken });
    if (result.ok) {
      window.location.href = `/checkout/success?order=${encodeURIComponent(publicCode)}&token=${encodeURIComponent(accessToken)}`;
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.card} glassmorphism`}>
      <Calendar size={28} className={styles.icon} />
      <h1 className={styles.title}>Sandbox Payment</h1>
      <p className={styles.text}>
        PayOS is not configured in this environment, so Savora is running in{' '}
        <strong>demo mode</strong>. Simulating the payment below runs the exact same
        server-side payment-confirmation path the PayOS webhook would trigger — this is not a
        client-side “paid” state.
      </p>

      <div className={styles.totals}>
        <div className={styles.row}>
          <span>Subtotal</span>
          <span>{formatCents(totals.subtotalCents)}</span>
        </div>
        {totals.deliveryFeeCents > 0 && (
          <div className={styles.row}>
            <span>Delivery fee</span>
            <span>{formatCents(totals.deliveryFeeCents)}</span>
          </div>
        )}
        <div className={styles.row}>
          <span>Tax</span>
          <span>{formatCents(totals.taxCents)}</span>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <span>Total</span>
          <span>{formatCents(totals.totalCents)}</span>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      )}

      <button className={styles.simulateBtn} onClick={simulatePayment} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            Confirming payment…
          </>
        ) : (
          'Simulate payment confirmation (demo)'
        )}
      </button>

      <Link
        href={`/checkout?cancelled=1&order=${encodeURIComponent(publicCode)}&token=${encodeURIComponent(accessToken)}`}
        className={styles.back}
      >
        Back to checkout
      </Link>
    </div>
  );
}

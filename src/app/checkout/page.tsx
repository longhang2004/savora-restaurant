import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { generatePageMetadata } from '@/lib/metadata';
import CheckoutForm, { type CheckoutResumeValues } from '@/components/checkout/CheckoutForm';
import { orderSuccessUrl } from '@/features/checkout/access';
import { findCheckoutResume, isPaymentRetryableOrder } from '@/features/checkout/resume';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';

export const metadata = generatePageMetadata({
  title: 'Checkout',
  description: 'Complete your Savora order — pickup or delivery.',
  path: '/checkout',
  noIndex: true,
});

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; order?: string; token?: string }>;
}) {
  const { cancelled, order: publicCode, token } = await searchParams;
  const hasResumeParams = publicCode !== undefined || token !== undefined;
  let resume: CheckoutResumeValues | undefined;

  if (hasResumeParams) {
    const resumedOrder = await findCheckoutResume(publicCode, token);
    if (!resumedOrder) notFound();
    if (resumedOrder.paymentStatus === 'PAID') {
      redirect(orderSuccessUrl(resumedOrder.id, resumedOrder.publicCode));
    }
    if (!isPaymentRetryableOrder(resumedOrder)) notFound();

    resume = {
      checkoutKey: resumedOrder.checkoutKey,
      customerName: resumedOrder.customerName,
      customerEmail: resumedOrder.customerEmail,
      customerPhone: resumedOrder.customerPhone,
      fulfillmentType: resumedOrder.fulfillmentType,
      scheduledFor: resumedOrder.scheduledFor
        ? `${utcToLocalDate(resumedOrder.scheduledFor)}T${utcToLocalTime(resumedOrder.scheduledFor)}`
        : null,
      deliveryAddress: resumedOrder.deliveryAddress,
      customerNotes: resumedOrder.customerNotes,
    };
  }

  return (
    <div className="container">
      <header style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
          Almost There
        </span>
        <h1 className="text-gradient" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginTop: '0.5rem' }}>
          Checkout
        </h1>
      </header>
      <div style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '4rem' }}>
        <CheckoutForm cancelled={cancelled === '1'} resume={resume} />
      </div>
    </div>
  );
}

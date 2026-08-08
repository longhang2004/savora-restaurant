import { describe, expect, it } from 'vitest';
import {
  buildCheckoutLineItems,
  buildCheckoutRedirectUrls,
  classifyCheckoutSession,
} from '@/features/payments/stripe';

describe('Stripe Checkout line items', () => {
  it('charges item lines, delivery, and tax in the order currency', () => {
    const items = buildCheckoutLineItems({
      currency: 'USD',
      lines: [
        {
          itemName: 'Wagyu Phở',
          unitPriceCents: 5000,
          quantity: 2,
        },
      ],
      deliveryFeeCents: 500,
      taxCents: 525,
    });

    expect(items.map((item) => item.price_data?.product_data?.name)).toEqual([
      'Wagyu Phở',
      'Delivery fee',
      'Tax',
    ]);
    expect(items.map((item) => item.price_data?.unit_amount)).toEqual([5000, 500, 525]);
    expect(items.every((item) => item.price_data?.currency === 'usd')).toBe(true);
  });
});

describe('Stripe Checkout return URLs', () => {
  it('secures both success and cancellation returns with the order token', () => {
    const urls = buildCheckoutRedirectUrls({
      publicCode: 'SV-RETURN-001',
      accessToken: 'signed-order-token',
    });

    expect(urls.successUrl).toContain('/checkout/success?order=SV-RETURN-001&token=signed-order-token');
    expect(urls.cancelUrl).toContain('/checkout?cancelled=1&order=SV-RETURN-001&token=signed-order-token');
  });
});

describe('Stripe Checkout session states', () => {
  it('treats a completed paid session as terminal instead of replaceable', () => {
    expect(
      classifyCheckoutSession({
        id: 'cs_complete',
        status: 'complete',
        payment_status: 'paid',
        url: null,
      }),
    ).toEqual({ state: 'complete', sessionId: 'cs_complete', paymentStatus: 'paid' });
  });

  it('keeps an expired session eligible for replacement', () => {
    expect(
      classifyCheckoutSession({
        id: 'cs_expired',
        status: 'expired',
        payment_status: 'unpaid',
        url: null,
      }),
    ).toEqual({ state: 'expired', sessionId: 'cs_expired' });
  });
});

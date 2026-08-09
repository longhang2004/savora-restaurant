import { describe, expect, it } from 'vitest';
import { buildPayOSRedirectUrls, classifyPayOSPaymentLink, payOSCheckoutUrl } from '@/features/payments/payos';

describe('PayOS payment-link states', () => {
  it('keeps pending links reusable', () => {
    expect(classifyPayOSPaymentLink({ id: 'link_pending', status: 'PENDING' })).toEqual({
      state: 'pending',
      paymentLinkId: 'link_pending',
    });
  });

  it('treats paid and processing links as non-replaceable', () => {
    expect(classifyPayOSPaymentLink({ id: 'link_paid', status: 'PAID' }).state).toBe('paid');
    expect(classifyPayOSPaymentLink({ id: 'link_processing', status: 'PROCESSING' }).state).toBe('processing');
  });

  it('allows replacement only for terminal unpaid links', () => {
    expect(classifyPayOSPaymentLink({ id: 'link_expired', status: 'EXPIRED' }).state).toBe('replaceable');
    expect(classifyPayOSPaymentLink({ id: 'link_cancelled', status: 'CANCELLED' }).state).toBe('replaceable');
    expect(classifyPayOSPaymentLink({ id: 'link_underpaid', status: 'UNDERPAID' }).state).toBe('manual_review');
  });
});

describe('PayOS redirects', () => {
  it('secures both browser return paths with the order token', () => {
    const urls = buildPayOSRedirectUrls({
      publicCode: 'SV-RETURN-001',
      accessToken: 'signed-order-token',
    });

    expect(urls.returnUrl).toContain('/checkout/success?order=SV-RETURN-001&token=signed-order-token');
    expect(urls.cancelUrl).toContain('/checkout?cancelled=1&order=SV-RETURN-001&token=signed-order-token');
    expect(payOSCheckoutUrl('abc123')).toBe('https://pay.payos.vn/web/abc123');
  });
});

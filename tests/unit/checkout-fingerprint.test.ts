import { describe, expect, it } from 'vitest';
import { createCheckoutFingerprint } from '@/features/checkout/fingerprint';

const base = {
  customerName: 'Guest',
  customerEmail: 'guest@example.com',
  customerPhone: '+84900000000',
  fulfillmentType: 'pickup' as const,
  scheduledFor: new Date('2099-01-05T11:30:00.000Z'),
  deliveryAddress: null,
  customerNotes: '  Ring the bell  ',
  lines: [
    {
      menuItemId: 'item-1',
      modifierOptionIds: ['option-b', 'option-a'],
      quantity: 1,
      specialInstructions: 'no coriander',
    },
  ],
};

describe('checkout request fingerprint', () => {
  it('is stable when line and modifier order changes', () => {
    const reordered = {
      ...base,
      lines: [{ ...base.lines[0], modifierOptionIds: ['option-a', 'option-b'] }],
    };

    expect(createCheckoutFingerprint(base)).toBe(createCheckoutFingerprint(reordered));
  });

  it('changes when a material checkout field changes', () => {
    expect(
      createCheckoutFingerprint(base),
    ).not.toBe(createCheckoutFingerprint({ ...base, customerEmail: 'other@example.com' }));
  });
});

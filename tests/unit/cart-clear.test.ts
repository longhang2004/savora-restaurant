import { describe, expect, it } from 'vitest';
import { shouldClearCartAfterPaidConfirmation } from '@/features/checkout/cart-clear';

describe('verified checkout cart clearing', () => {
  it('clears only after a verified paid confirmation', () => {
    expect(shouldClearCartAfterPaidConfirmation('PAID', true)).toBe(true);
    expect(shouldClearCartAfterPaidConfirmation('UNPAID', true)).toBe(false);
    expect(shouldClearCartAfterPaidConfirmation('PAID', false)).toBe(false);
  });
});

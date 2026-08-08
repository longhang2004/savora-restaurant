'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { shouldClearCartAfterPaidConfirmation } from '@/features/checkout/cart-clear';

export default function ClearCartOnPaid({
  paymentStatus,
  accessVerified,
}: {
  paymentStatus: string;
  accessVerified: boolean;
}) {
  const { clear } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current || !shouldClearCartAfterPaidConfirmation(paymentStatus, accessVerified)) {
      return;
    }
    cleared.current = true;
    clear();
  }, [accessVerified, clear, paymentStatus]);

  return null;
}

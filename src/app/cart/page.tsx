import React from 'react';
import CartPage from '@/components/cart/CartPage';
import { generatePageMetadata } from '@/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Your Cart',
  description: 'Review your Savora order before checkout.',
  path: '/cart',
});

export default function CartRoute() {
  return <CartPage />;
}

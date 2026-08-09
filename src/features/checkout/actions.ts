/**
 * Checkout server actions.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { isDemoMode } from '@/config/env';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { AppError, ErrorCodes, toErrorResult, toSuccessResult } from '@/lib/errors';
import { markOrderPaid } from '@/features/payments/service';
import { createCheckoutOrder } from './service';
import type { CheckoutInput } from './validation';
import { verifyOrderAccessToken } from './access';

export async function createCheckoutAction(input: CheckoutInput) {
  try {
    const data = await createCheckoutOrder(input);
    return toSuccessResult(data);
  } catch (err) {
    return toErrorResult(err);
  }
}

/**
 * DEMO_MODE-only: simulates the PayOS webhook for local demos.
 * Calls the exact same idempotent payment-confirmation service the
 * webhook uses — this is not a separate "fake paid" code path.
 */
export async function demoConfirmPaymentAction(input: { publicCode: string; accessToken: string }) {
  try {
    if (!isDemoMode) {
      throw new AppError(ErrorCodes.NOT_CONFIGURED, 'Demo payments are disabled.', {
        status: 403,
      });
    }
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.publicCode, input.publicCode));
    if (!order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found.', { status: 404 });
    }
    if (!verifyOrderAccessToken(order.id, order.publicCode, input.accessToken)) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found.', { status: 404 });
    }

    await markOrderPaid(order.id);
    revalidatePath('/checkout/success');
    revalidatePath('/checkout/sandbox');
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return toSuccessResult({ publicCode: order.publicCode });
  } catch (err) {
    return toErrorResult(err);
  }
}

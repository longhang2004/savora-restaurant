/**
 * Checkout orchestration.
 *
 * 1. Validate input (Zod).
 * 2. Price genuinely new checkouts from current menu data; existing retries
 *    use their persisted immutable order snapshots.
 * 3. Create a PENDING order with immutable item/modifier snapshots.
 * 4. Hand off to Stripe Checkout (or the DEMO_MODE sandbox).
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { restaurantConfig } from '@/config/restaurant';
import { isDemoMode } from '@/config/env';
import { db } from '@/lib/db/client';
import { orderItems, orderItemModifiers, orders } from '@/lib/db/schema';
import { AppError, ErrorCodes, isUniqueViolation, parseOrThrow } from '@/lib/errors';
import { percentOfCents } from '@/lib/money';
import { localDateTimeToUtc } from '@/lib/time';
import { priceAndValidateCart, validateCartLineShape } from '@/features/orders/pricing';
import {
  createCheckoutSession,
  retrieveReusableCheckoutSession,
  stripeConfigured,
  type CheckoutSessionLine,
} from '@/features/payments/stripe';
import { checkoutSchema, type CheckoutInput } from './validation';
import { createCheckoutFingerprint } from './fingerprint';
import { createOrderAccessToken, orderSuccessUrl } from './access';
import { isPaymentRetryableOrder } from './resume';
import { validateScheduledOrderTime } from './scheduling';

export interface CheckoutResult {
  mode: 'stripe' | 'sandbox';
  url: string;
  publicCode: string;
  totalCents: number;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateOrderCode(): string {
  const bytes = randomBytes(6);
  let code = 'SV-';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export async function createCheckoutOrder(rawInput: CheckoutInput): Promise<CheckoutResult> {
  const input = parseOrThrow(checkoutSchema, rawInput);
  const lines = input.lines.map(validateCartLineShape);

  let deliveryFeeCents = 0;
  if (input.fulfillmentType === 'delivery') {
    if (!input.deliveryAddress) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'A delivery address is required.');
    }
    deliveryFeeCents = restaurantConfig.delivery.feeCents;
  }

  const existing = await findCheckoutOrder(input.checkoutKey);
  const scheduledFor = input.scheduledFor
    ? existing
      ? localDateTimeToUtc(input.scheduledFor)
      : validateScheduledOrderTime(input.scheduledFor)
    : null;

  const deliveryAddress =
    input.fulfillmentType === 'delivery' && input.deliveryAddress
      ? {
          line1: input.deliveryAddress.line1,
          district: input.deliveryAddress.district,
          city: input.deliveryAddress.city,
          notes: input.deliveryAddress.notes,
        }
      : null;
  const customerNotes = input.customerNotes?.trim() || null;
  const checkoutFingerprint = createCheckoutFingerprint({
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    fulfillmentType: input.fulfillmentType,
    scheduledFor,
    deliveryAddress,
    customerNotes,
    lines,
  });

  if (existing) {
    return resumeCheckout(existing, checkoutFingerprint, input.checkoutKey);
  }

  // Only a genuinely new logical checkout reads current menu prices.
  const priced = await priceAndValidateCart(lines);
  const taxCents = percentOfCents(priced.subtotalCents, restaurantConfig.taxRateBps);
  const totalCents = priced.subtotalCents + deliveryFeeCents + taxCents;

  // Retry on the astronomically unlikely order-code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const publicCode = generateOrderCode();
    try {
      const order = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            publicCode,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            fulfillmentType: input.fulfillmentType,
            scheduledFor,
            deliveryAddress: input.deliveryAddress
              ? deliveryAddress
              : null,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            currency: 'USD',
            subtotalCents: priced.subtotalCents,
            deliveryFeeCents,
            taxCents,
            totalCents,
            customerNotes,
            checkoutKey: input.checkoutKey,
            checkoutFingerprint,
          })
          .returning();

        // Immutable order-time snapshots.
        for (const line of priced.lines) {
          const [orderItem] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              menuItemId: line.menuItemId,
              itemName: line.itemName,
              unitPriceCents: line.unitPriceCents,
              quantity: line.quantity,
              lineTotalCents: line.lineTotalCents,
              specialInstructions: line.specialInstructions,
            })
            .returning();
          for (const mod of line.modifiers) {
            await tx.insert(orderItemModifiers).values({
              orderItemId: orderItem.id,
              modifierOptionId: mod.optionId,
              groupName: mod.groupName,
              optionName: mod.optionName,
              priceDeltaCents: mod.priceDeltaCents,
            });
          }
        }

        return order;
      });

      return await handOffToPayment(
        order,
        priced.lines,
        input.checkoutKey,
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        const racedOrder = await findCheckoutOrder(input.checkoutKey);
        if (racedOrder) {
          return resumeCheckout(
            racedOrder,
            checkoutFingerprint,
            input.checkoutKey,
          );
        }
        if (attempt < 2) {
          continue; // order-code collision — regenerate
        }
        throw new AppError(
          ErrorCodes.CHECKOUT_DUPLICATE,
          'This checkout was already submitted. Check your recent orders or try again.',
          { status: 409, cause: err },
        );
      }
      throw err;
    }
  }
  throw new AppError(ErrorCodes.INTERNAL, 'Could not create the order. Please try again.');
}

async function handOffToPayment(
  order: typeof orders.$inferSelect,
  lines: CheckoutSessionLine[],
  checkoutKey: string,
): Promise<CheckoutResult> {
  if (order.paymentStatus === 'PAID') {
    return {
      mode: order.stripeCheckoutSessionId ? 'stripe' : 'sandbox',
      url: orderSuccessUrl(order.id, order.publicCode),
      publicCode: order.publicCode,
      totalCents: order.totalCents,
    };
  }

  if (!isPaymentRetryableOrder(order)) {
    throw new AppError(
      ErrorCodes.CHECKOUT_DUPLICATE,
      'This order is no longer available for payment retry. Please start checkout again.',
      { status: 409 },
    );
  }

  if (stripeConfigured()) {
    const accessToken = createOrderAccessToken(order.id, order.publicCode);
    if (order.stripeCheckoutSessionId) {
      const reusable = await retrieveReusableCheckoutSession(order.stripeCheckoutSessionId, accessToken);
      if (reusable?.state === 'complete') {
        return {
          mode: 'stripe',
          url: orderSuccessUrl(order.id, order.publicCode),
          publicCode: order.publicCode,
          totalCents: order.totalCents,
        };
      }
      if (reusable?.state === 'open') {
        return {
          mode: 'stripe',
          url: reusable.url,
          publicCode: order.publicCode,
          totalCents: order.totalCents,
        };
      }
    }

    const { sessionId, url } = await createCheckoutSession({
      order,
      lines,
      deliveryFeeCents: order.deliveryFeeCents,
      taxCents: order.taxCents,
      checkoutKey: order.stripeCheckoutSessionId
        ? `${checkoutKey}:${order.stripeCheckoutSessionId}:retry`
        : checkoutKey,
      accessToken,
    });
    await db.update(orders).set({ stripeCheckoutSessionId: sessionId }).where(eq(orders.id, order.id));
    return { mode: 'stripe', url, publicCode: order.publicCode, totalCents: order.totalCents };
  }

  if (isDemoMode) {
    const accessToken = createOrderAccessToken(order.id, order.publicCode);
    return {
      mode: 'sandbox',
      url: `/checkout/sandbox?order=${encodeURIComponent(order.publicCode)}&token=${encodeURIComponent(accessToken)}`,
      publicCode: order.publicCode,
      totalCents: order.totalCents,
    };
  }

  throw new AppError(
    ErrorCodes.NOT_CONFIGURED,
    'Payments are not configured. Please try again later.',
    { status: 503 },
  );
}

async function findCheckoutOrder(checkoutKey: string) {
  const [order] = await db.select().from(orders).where(eq(orders.checkoutKey, checkoutKey));
  return order;
}

async function resumeCheckout(
  order: typeof orders.$inferSelect,
  fingerprint: string,
  checkoutKey: string,
): Promise<CheckoutResult> {
  if (order.checkoutFingerprint !== fingerprint) {
    throw new AppError(
      ErrorCodes.CHECKOUT_DUPLICATE,
      'This checkout key is already tied to a different order. Please start checkout again.',
      { status: 409 },
    );
  }

  if (order.paymentStatus === 'PAID') {
    return handOffToPayment(order, [], checkoutKey);
  }

  if (!isPaymentRetryableOrder(order)) {
    throw new AppError(
      ErrorCodes.CHECKOUT_DUPLICATE,
      'This order is no longer available for payment retry. Please start checkout again.',
      { status: 409 },
    );
  }

  const lines = await loadPersistedPaymentLines(order);
  return handOffToPayment(order, lines, checkoutKey);
}

async function loadPersistedPaymentLines(
  order: typeof orders.$inferSelect,
): Promise<CheckoutSessionLine[]> {
  const items = await db
    .select({
      itemName: orderItems.itemName,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const subtotalCents = items.reduce((sum, item) => {
    if (item.lineTotalCents !== item.unitPriceCents * item.quantity) {
      throw new AppError(ErrorCodes.INTERNAL, 'The persisted order snapshot is inconsistent.');
    }
    return sum + item.lineTotalCents;
  }, 0);

  if (items.length === 0 || subtotalCents !== order.subtotalCents) {
    throw new AppError(ErrorCodes.INTERNAL, 'The persisted order snapshot is inconsistent.');
  }

  return items.map(({ itemName, unitPriceCents, quantity }) => ({
    itemName,
    unitPriceCents,
    quantity,
  }));
}

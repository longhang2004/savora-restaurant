/**
 * Checkout orchestration.
 *
 * 1. Validate input (Zod).
 * 2. Price genuinely new checkouts from current menu data; existing retries
 *    use their persisted immutable order snapshots.
 * 3. Create a PENDING order with immutable item/modifier snapshots.
 * 4. Hand off to PayOS (or the DEMO_MODE sandbox).
 */
import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
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
  createPayOSPaymentLink,
  generatePayOSOrderCode,
  payosConfigured,
  payOSCheckoutUrl,
  retrievePayOSPaymentLink,
  retrievePayOSPaymentLinkByOrderCode,
  type PayOSPaymentLine,
  type PayOSPaymentLinkLookup,
} from '@/features/payments/payos';
import { checkoutSchema, type CheckoutInput } from './validation';
import { createCheckoutFingerprint } from './fingerprint';
import { createOrderAccessToken, orderSuccessUrl } from './access';
import { isPaymentRetryableOrder } from './resume';
import { validateScheduledOrderTime } from './scheduling';

export interface CheckoutResult {
  mode: 'payos' | 'sandbox';
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
    return resumeCheckout(existing, checkoutFingerprint);
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
            currency: restaurantConfig.currency,
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
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        const racedOrder = await findCheckoutOrder(input.checkoutKey);
        if (racedOrder) {
          return resumeCheckout(racedOrder, checkoutFingerprint);
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
  lines: PayOSPaymentLine[],
): Promise<CheckoutResult> {
  if (order.paymentStatus === 'PAID') {
    return {
      mode: order.payosPaymentLinkId ? 'payos' : 'sandbox',
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

  if (payosConfigured()) {
    const accessToken = createOrderAccessToken(order.id, order.publicCode);
    return handOffToPayOS(order, lines, accessToken);
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
): Promise<CheckoutResult> {
  if (order.checkoutFingerprint !== fingerprint) {
    throw new AppError(
      ErrorCodes.CHECKOUT_DUPLICATE,
      'This checkout key is already tied to a different order. Please start checkout again.',
      { status: 409 },
    );
  }

  if (order.paymentStatus === 'PAID') {
    return handOffToPayment(order, []);
  }

  if (!isPaymentRetryableOrder(order)) {
    throw new AppError(
      ErrorCodes.CHECKOUT_DUPLICATE,
      'This order is no longer available for payment retry. Please start checkout again.',
      { status: 409 },
    );
  }

  const lines = await loadPersistedPaymentLines(order);
  return handOffToPayment(order, lines);
}

async function loadPersistedPaymentLines(
  order: typeof orders.$inferSelect,
): Promise<PayOSPaymentLine[]> {
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

async function handOffToPayOS(
  order: typeof orders.$inferSelect,
  lines: PayOSPaymentLine[],
  accessToken: string,
): Promise<CheckoutResult> {
  if (order.payosPaymentLinkId) {
    const link = await retrievePayOSPaymentLink(order.payosPaymentLinkId);
    const handled = await handOffExistingPayOSLink(order, link);
    if (handled) return handled;

    // A cancelled, expired, or failed link cannot be paid. Allocate a new
    // provider order code before creating the next payment attempt.
    const replacement = await replacePayOSAttempt(order);
    if (!replacement.owned) {
      return handOffToPayOS(replacement.order, lines, accessToken);
    }
    return createAndPersistPayOSLink(replacement.order, lines, accessToken);
  }

  if (order.payosOrderCode) {
    // A previous create request may have succeeded remotely but failed before
    // its response was persisted. Recover by the pre-reserved provider code;
    // never create a second link for that code from a retry.
    const link = await retrievePayOSPaymentLinkByOrderCode(order.payosOrderCode);
    const recovered = await handOffExistingPayOSLink(order, link);
    if (recovered) return recovered;
    throw new AppError(
      ErrorCodes.PAYMENT_NOT_CONFIRMED,
      'Your earlier payment attempt needs review before another payment can be started.',
      { status: 409 },
    );
  }

  const initial = await reserveInitialPayOSAttempt(order);
  if (!initial.owned) {
    return handOffToPayOS(initial.order, lines, accessToken);
  }
  return createAndPersistPayOSLink(initial.order, lines, accessToken);
}

async function handOffExistingPayOSLink(
  order: typeof orders.$inferSelect,
  link: PayOSPaymentLinkLookup,
): Promise<CheckoutResult | null> {
  if (link.state === 'pending') {
    const url = order.payosCheckoutUrl ?? payOSCheckoutUrl(link.paymentLinkId);
    if (!order.payosCheckoutUrl || order.payosPaymentLinkId !== link.paymentLinkId) {
      await db
        .update(orders)
        .set({ payosPaymentLinkId: link.paymentLinkId, payosCheckoutUrl: url })
        .where(eq(orders.id, order.id));
    }
    return { mode: 'payos', url, publicCode: order.publicCode, totalCents: order.totalCents };
  }
  if (link.state === 'paid' || link.state === 'processing') {
    // Webhook delivery may lag the provider. The confirmation page only uses
    // DB truth and therefore never clears the cart or fulfills prematurely.
    return {
      mode: 'payos',
      url: orderSuccessUrl(order.id, order.publicCode),
      publicCode: order.publicCode,
      totalCents: order.totalCents,
    };
  }
  if (link.state === 'manual_review') {
    throw new AppError(
      ErrorCodes.PAYMENT_NOT_CONFIRMED,
      'PayOS reported a partial payment. Please contact the restaurant before retrying.',
      { status: 409 },
    );
  }
  return null;
}

interface PayOSAttemptReservation {
  order: typeof orders.$inferSelect;
  /** Only the request that atomically wrote the code may create a provider link. */
  owned: boolean;
}

async function reserveInitialPayOSAttempt(order: typeof orders.$inferSelect): Promise<PayOSAttemptReservation> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [reserved] = await db
      .update(orders)
      .set({ payosOrderCode: generatePayOSOrderCode() })
      .where(and(eq(orders.id, order.id), isNull(orders.payosOrderCode)))
      .returning();
    if (reserved) return { order: reserved, owned: true };

    const [current] = await db.select().from(orders).where(eq(orders.id, order.id));
    if (!current) throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found.', { status: 404 });
    if (current.payosOrderCode) return { order: current, owned: false };
  }
  throw new AppError(ErrorCodes.INTERNAL, 'Could not reserve a PayOS payment attempt.', { status: 500 });
}

async function replacePayOSAttempt(order: typeof orders.$inferSelect): Promise<PayOSAttemptReservation> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [replacement] = await db
      .update(orders)
      .set({
        payosOrderCode: generatePayOSOrderCode(),
        payosPaymentLinkId: null,
        payosCheckoutUrl: null,
      })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.payosPaymentLinkId, order.payosPaymentLinkId!),
          eq(orders.payosOrderCode, order.payosOrderCode!),
        ),
      )
      .returning();
    if (replacement) return { order: replacement, owned: true };

    const [current] = await db.select().from(orders).where(eq(orders.id, order.id));
    if (!current) throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found.', { status: 404 });
    if (current.payosPaymentLinkId !== order.payosPaymentLinkId || current.payosOrderCode !== order.payosOrderCode) {
      return { order: current, owned: false };
    }
  }
  throw new AppError(ErrorCodes.INTERNAL, 'Could not reserve a replacement PayOS payment attempt.', { status: 500 });
}

async function createAndPersistPayOSLink(
  order: typeof orders.$inferSelect,
  lines: PayOSPaymentLine[],
  accessToken: string,
): Promise<CheckoutResult> {
  if (!order.payosOrderCode) {
    throw new AppError(ErrorCodes.INTERNAL, 'PayOS payment attempt was not reserved.', { status: 500 });
  }
  const link = await createPayOSPaymentLink({ order, lines, orderCode: order.payosOrderCode, accessToken });
  const [updated] = await db
    .update(orders)
    .set({ payosPaymentLinkId: link.paymentLinkId, payosCheckoutUrl: link.checkoutUrl })
    .where(and(eq(orders.id, order.id), eq(orders.payosOrderCode, order.payosOrderCode)))
    .returning();
  if (!updated || updated.payosPaymentLinkId !== link.paymentLinkId) {
    throw new AppError(ErrorCodes.INTERNAL, 'Could not persist the PayOS payment attempt.', { status: 500 });
  }
  return { mode: 'payos', url: link.checkoutUrl, publicCode: updated.publicCode, totalCents: updated.totalCents };
}

/**
 * Stripe client and Checkout Session creation.
 *
 * Test mode for development; sandbox payment (DEMO_MODE) is used when
 * Stripe is not configured.
 */
import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from '@/config/env';
import { restaurantConfig } from '@/config/restaurant';
import { AppError, ErrorCodes } from '@/lib/errors';
import type { Order } from '@/lib/db/schema';

export interface CheckoutSessionLine {
  itemName: string;
  unitPriceCents: number;
  quantity: number;
}

export type CheckoutSessionLookup =
  | { state: 'open'; sessionId: string; url: string }
  | { state: 'complete'; sessionId: string; paymentStatus: Stripe.Checkout.Session.PaymentStatus }
  | { state: 'expired'; sessionId: string };

export function classifyCheckoutSession(
  session: Pick<Stripe.Checkout.Session, 'id' | 'status' | 'payment_status' | 'url'>,
): CheckoutSessionLookup | null {
  if (session.status === 'complete') {
    return { state: 'complete', sessionId: session.id, paymentStatus: session.payment_status };
  }
  if (session.status === 'expired') {
    return { state: 'expired', sessionId: session.id };
  }
  if (session.status !== 'open' || !session.url) return null;
  return { state: 'open', sessionId: session.id, url: session.url };
}

let stripeClient: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(serverEnv.STRIPE_SECRET_KEY);
}

export function buildCheckoutLineItems(input: {
  currency: string;
  lines: CheckoutSessionLine[];
  deliveryFeeCents: number;
  taxCents: number;
}): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const currency = input.currency.toLowerCase();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency,
      unit_amount: line.unitPriceCents,
      product_data: { name: line.itemName },
    },
  }));

  if (input.deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: input.deliveryFeeCents,
        product_data: { name: 'Delivery fee' },
      },
    });
  }

  if (input.taxCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: input.taxCents,
        product_data: { name: 'Tax' },
      },
    });
  }

  return lineItems;
}

export function buildCheckoutRedirectUrls(input: {
  publicCode: string;
  accessToken: string;
}): { successUrl: string; cancelUrl: string } {
  const order = encodeURIComponent(input.publicCode);
  const token = encodeURIComponent(input.accessToken);
  return {
    successUrl: `${restaurantConfig.siteUrl}/checkout/success?order=${order}&token=${token}`,
    cancelUrl: `${restaurantConfig.siteUrl}/checkout?cancelled=1&order=${order}&token=${token}`,
  };
}

export function getStripe(): Stripe {
  if (!stripeConfigured()) {
    throw new AppError(ErrorCodes.NOT_CONFIGURED, 'Stripe is not configured.', { status: 503 });
  }
  if (!stripeClient) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

export async function createCheckoutSession(input: {
  order: Order;
  lines: CheckoutSessionLine[];
  deliveryFeeCents: number;
  taxCents: number;
  checkoutKey: string;
  accessToken: string;
}): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();

  const lineItems = buildCheckoutLineItems({
    currency: input.order.currency,
    lines: input.lines,
    deliveryFeeCents: input.deliveryFeeCents,
    taxCents: input.taxCents,
  });
  const lineItemsTotalCents = lineItems.reduce(
    (sum, item) => sum + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 0),
    0,
  );
  if (lineItemsTotalCents !== input.order.totalCents) {
    throw new AppError(ErrorCodes.INTERNAL, 'Checkout amount does not match the persisted order.');
  }

  const redirectUrls = buildCheckoutRedirectUrls({
    publicCode: input.order.publicCode,
    accessToken: input.accessToken,
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: input.order.publicCode,
      customer_email: input.order.customerEmail,
      line_items: lineItems,
      metadata: {
        orderId: input.order.id,
        publicCode: input.order.publicCode,
      },
      success_url: redirectUrls.successUrl,
      cancel_url: redirectUrls.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: input.checkoutKey },
  );

  if (!session.url) {
    throw new AppError(ErrorCodes.INTERNAL, 'Stripe did not return a checkout URL.');
  }

  return { sessionId: session.id, url: session.url };
}

export async function retrieveReusableCheckoutSession(
  sessionId: string,
  accessToken?: string,
): Promise<CheckoutSessionLookup | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  // A completed session is not reusable, but it is also not replaceable: the
  // webhook may be behind Stripe, and a second session could create a second charge.
  const lookup = classifyCheckoutSession(session);
  if (!lookup || lookup.state !== 'open') return lookup;
  if (accessToken) {
    const expected = buildCheckoutRedirectUrls({
      publicCode: session.client_reference_id ?? '',
      accessToken,
    });
    if (session.success_url !== expected.successUrl || session.cancel_url !== expected.cancelUrl) {
      return null;
    }
  }
  return lookup;
}

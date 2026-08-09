/**
 * PayOS payment-link boundary.
 *
 * Amounts are integer VND. The SDK signs outbound requests and verifies
 * response signatures; webhook verification uses the same checksum key.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { PayOS } from '@payos/node';
import { restaurantConfig } from '@/config/restaurant';
import { AppError, ErrorCodes } from '@/lib/errors';
import type { Order } from '@/lib/db/schema';

export interface PayOSPaymentLine {
  itemName: string;
  unitPriceCents: number;
  quantity: number;
}

export type PayOSPaymentLinkStatus =
  | 'PENDING'
  | 'CANCELLED'
  | 'UNDERPAID'
  | 'PAID'
  | 'EXPIRED'
  | 'PROCESSING'
  | 'FAILED';

export type PayOSPaymentLinkLookup =
  | { state: 'pending'; paymentLinkId: string }
  | { state: 'paid'; paymentLinkId: string }
  | { state: 'processing'; paymentLinkId: string }
  | { state: 'replaceable'; paymentLinkId: string }
  | { state: 'manual_review'; paymentLinkId: string };

let client: PayOS | null = null;
let clientKey = '';

export function payosConfigured(): boolean {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

export function getPayOS(): PayOS {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) {
    throw new AppError(ErrorCodes.NOT_CONFIGURED, 'PayOS is not configured.', { status: 503 });
  }

  const key = `${clientId}:${apiKey}:${checksumKey}`;
  if (!client || key !== clientKey) {
    client = new PayOS({ clientId, apiKey, checksumKey });
    clientKey = key;
  }
  return client;
}

export function buildPayOSRedirectUrls(input: {
  publicCode: string;
  accessToken: string;
}): { returnUrl: string; cancelUrl: string } {
  const order = encodeURIComponent(input.publicCode);
  const token = encodeURIComponent(input.accessToken);
  return {
    returnUrl: `${restaurantConfig.siteUrl}/checkout/success?order=${order}&token=${token}`,
    cancelUrl: `${restaurantConfig.siteUrl}/checkout?cancelled=1&order=${order}&token=${token}`,
  };
}

export function classifyPayOSPaymentLink(input: {
  id: string;
  status: PayOSPaymentLinkStatus;
}): PayOSPaymentLinkLookup {
  switch (input.status) {
    case 'PENDING':
      return { state: 'pending', paymentLinkId: input.id };
    case 'PAID':
      return { state: 'paid', paymentLinkId: input.id };
    case 'PROCESSING':
      return { state: 'processing', paymentLinkId: input.id };
    case 'CANCELLED':
    case 'EXPIRED':
    case 'FAILED':
      return { state: 'replaceable', paymentLinkId: input.id };
    case 'UNDERPAID':
      return { state: 'manual_review', paymentLinkId: input.id };
  }
}

/** A random positive 10-digit integer, within PostgreSQL's integer range. */
export function generatePayOSOrderCode(): number {
  return 1_000_000_000 + (randomBytes(4).readUInt32BE(0) % 1_000_000_000);
}

export function payOSCheckoutUrl(paymentLinkId: string): string {
  return `https://pay.payos.vn/web/${encodeURIComponent(paymentLinkId)}`;
}

export async function createPayOSPaymentLink(input: {
  order: Order;
  lines: PayOSPaymentLine[];
  orderCode: number;
  accessToken: string;
}): Promise<{ paymentLinkId: string; checkoutUrl: string }> {
  if (input.order.currency !== 'VND') {
    throw new AppError(ErrorCodes.INTERNAL, 'PayOS orders must use VND.', { status: 500 });
  }

  const itemTotal = input.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const expectedTotal = itemTotal + input.order.deliveryFeeCents + input.order.taxCents;
  if (expectedTotal !== input.order.totalCents) {
    throw new AppError(ErrorCodes.INTERNAL, 'Payment amount does not match the persisted order.', {
      status: 500,
    });
  }

  const { returnUrl, cancelUrl } = buildPayOSRedirectUrls({
    publicCode: input.order.publicCode,
    accessToken: input.accessToken,
  });
  const items = input.lines.map((line) => ({
    name: line.itemName,
    quantity: line.quantity,
    price: line.unitPriceCents,
  }));
  if (input.order.deliveryFeeCents > 0) {
    items.push({ name: 'Delivery fee', quantity: 1, price: input.order.deliveryFeeCents });
  }
  if (input.order.taxCents > 0) {
    items.push({ name: 'Tax', quantity: 1, price: input.order.taxCents });
  }

  const link = await getPayOS().paymentRequests.create({
    orderCode: input.orderCode,
    amount: input.order.totalCents,
    description: `Savora ${input.order.publicCode}`,
    items,
    returnUrl,
    cancelUrl,
    expiredAt: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (link.orderCode !== input.orderCode || link.amount !== input.order.totalCents || link.currency !== 'VND') {
    throw new AppError(ErrorCodes.INTERNAL, 'PayOS returned inconsistent payment details.', { status: 502 });
  }
  return { paymentLinkId: link.paymentLinkId, checkoutUrl: link.checkoutUrl };
}

export async function retrievePayOSPaymentLink(paymentLinkId: string): Promise<PayOSPaymentLinkLookup> {
  const link = await getPayOS().paymentRequests.get(paymentLinkId);
  return classifyPayOSPaymentLink({ id: link.id, status: link.status });
}

export async function retrievePayOSPaymentLinkByOrderCode(orderCode: number): Promise<PayOSPaymentLinkLookup> {
  const link = await getPayOS().paymentRequests.get(orderCode);
  return classifyPayOSPaymentLink({ id: link.id, status: link.status });
}

export async function verifyPayOSWebhook(payload: Parameters<PayOS['webhooks']['verify']>[0]) {
  return getPayOS().webhooks.verify(payload);
}

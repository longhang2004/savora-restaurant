/**
 * Server-only customer access token for order confirmation pages.
 *
 * The public order code is a reference, not a secret. This HMAC binds an
 * unguessable capability to the order's internal id and public code without
 * adding another stored secret column to the orders table.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/config/env';

export function createOrderAccessToken(
  orderId: string,
  publicCode: string,
  secret = serverEnv.SESSION_SECRET,
): string {
  return createHmac('sha256', secret)
    .update(accessMessage(orderId, publicCode))
    .digest('base64url');
}

export function verifyOrderAccessToken(
  orderId: string,
  publicCode: string,
  token: string | undefined,
  secret = serverEnv.SESSION_SECRET,
): boolean {
  if (!token) return false;

  const expected = Buffer.from(createOrderAccessToken(orderId, publicCode, secret));
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Relative customer confirmation destination for a verified order. */
export function orderSuccessUrl(orderId: string, publicCode: string): string {
  const token = createOrderAccessToken(orderId, publicCode);
  return `/checkout/success?order=${encodeURIComponent(publicCode)}&token=${encodeURIComponent(token)}`;
}

function accessMessage(orderId: string, publicCode: string): string {
  return `savora-order:${orderId}:${publicCode}`;
}

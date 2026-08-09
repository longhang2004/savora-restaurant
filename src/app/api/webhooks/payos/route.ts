/**
 * POST /api/webhooks/payos
 *
 * PayOS signs webhook data with the channel checksum key. Browser return and
 * cancel URLs are deliberately not payment truth; only this verified webhook
 * can mark an order paid.
 */
import { NextResponse } from 'next/server';
import { payosConfigured, verifyPayOSWebhook } from '@/features/payments/payos';
import { processPayOSWebhook } from '@/features/payments/payos-webhook';

export async function POST(request: Request) {
  if (!payosConfigured()) {
    return NextResponse.json({ error: 'PayOS is not configured.' }, { status: 503 });
  }

  let payload: { code?: unknown; success?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  let data;
  try {
    data = await verifyPayOSWebhook(payload as Parameters<typeof verifyPayOSWebhook>[0]);
  } catch (err) {
    console.error('[payos-webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  // PayOS expects a 2xx response for deliveries it should not retry. A
  // verified non-success notification does not mutate payment state.
  if (payload.success !== true || payload.code !== '00') {
    return NextResponse.json({ handled: false });
  }

  try {
    return NextResponse.json(await processPayOSWebhook(data));
  } catch (err) {
    console.error('[payos-webhook] processing failed:', err);
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }
}

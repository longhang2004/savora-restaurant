/**
 * POST /api/webhooks/stripe
 *
 * Verifies the Stripe signature against the raw request body, then
 * processes the event idempotently. The webhook (not the browser
 * redirect) is the payment source of truth.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processStripeEvent } from '@/features/payments/webhook';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  // Read at request time so tests and deployments can rotate the secret
  // without a restart.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured.' },
      { status: 503 },
    );
  }

  const payload = await request.text();

  // constructEventAsync is a local cryptographic verification — the
  // client instance needs no live API access or configured secret key.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_local');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    // Return 200 for handled AND ignored events; Stripe stops retrying on 2xx.
    return NextResponse.json(result);
  } catch (err) {
    console.error('[webhook] processing failed:', err);
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }
}

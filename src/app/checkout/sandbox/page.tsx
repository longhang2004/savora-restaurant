/**
 * /checkout/sandbox — DEMO_MODE-only payment simulation page.
 * Reads the real order; never marks anything paid by itself.
 */
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orders } from '@/lib/db/schema';
import { isDemoMode } from '@/config/env';
import { generatePageMetadata } from '@/lib/metadata';
import SandboxPage from '@/components/checkout/SandboxPage';
import { verifyOrderAccessToken } from '@/features/checkout/access';

export const metadata = generatePageMetadata({
  title: 'Sandbox Payment',
  description: 'Demo payment confirmation.',
  path: '/checkout/sandbox',
  noIndex: true,
});

export default async function SandboxRoute({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const { order: publicCode, token } = await searchParams;

  if (!isDemoMode || !publicCode || !token) {
    notFound();
  }

  const [order] = await db.select().from(orders).where(eq(orders.publicCode, publicCode));
  if (!order || !verifyOrderAccessToken(order.id, order.publicCode, token)) notFound();

  return (
    <div className="container" style={{ maxWidth: '640px', padding: '3rem 1rem 5rem' }}>
      <SandboxPage
        publicCode={order.publicCode}
        accessToken={token}
        totals={{
          subtotalCents: order.subtotalCents,
          deliveryFeeCents: order.deliveryFeeCents,
          taxCents: order.taxCents,
          totalCents: order.totalCents,
        }}
      />
    </div>
  );
}

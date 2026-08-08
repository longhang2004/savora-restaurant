/** Money helpers. All stored amounts are integer minor units (cents). */

export function formatCents(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Round half-up on integer division (avoid floating-point money drift). */
export function percentOfCents(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}

/**
 * Money helpers. Amount fields keep their legacy `*Cents` names, but store
 * integer minor units for their currency: VND has no fractional minor unit.
 */

export function formatCents(cents: number, currency: string = 'VND'): string {
  const fractionDigits = currency.toUpperCase() === 'VND' ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 10 ** fractionDigits);
}

/** Round half-up on integer division (avoid floating-point money drift). */
export function percentOfCents(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}

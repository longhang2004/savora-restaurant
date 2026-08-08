import { createHash } from 'node:crypto';

export interface CheckoutFingerprintInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: 'pickup' | 'delivery';
  scheduledFor: Date | null;
  deliveryAddress: {
    line1: string;
    district: string;
    city: string;
    notes?: string;
  } | null;
  customerNotes: string | null;
  lines: {
    menuItemId: string;
    modifierOptionIds: string[];
    quantity: number;
    specialInstructions?: string;
  }[];
}

/**
 * Canonical identity for a checkout idempotency key.
 *
 * Order and modifier ordering are presentation details, while customer,
 * fulfillment, schedule, and line contents are materially significant.
 */
export function createCheckoutFingerprint(input: CheckoutFingerprintInput): string {
  const payload = {
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerPhone: input.customerPhone.trim(),
    fulfillmentType: input.fulfillmentType,
    scheduledFor: input.scheduledFor?.toISOString() ?? null,
    deliveryAddress: input.deliveryAddress
      ? {
          line1: input.deliveryAddress.line1.trim(),
          district: input.deliveryAddress.district.trim(),
          city: input.deliveryAddress.city.trim(),
          notes: input.deliveryAddress.notes?.trim() || null,
        }
      : null,
    customerNotes: input.customerNotes?.trim() || null,
    lines: input.lines
      .map((line) => ({
        menuItemId: line.menuItemId,
        modifierOptionIds: [...line.modifierOptionIds].sort(),
        quantity: line.quantity,
        specialInstructions: line.specialInstructions?.trim() || null,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

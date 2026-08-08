/**
 * Checkout input validation (server-side).
 */
import { z } from 'zod';
import { restaurantConfig } from '@/config/restaurant';
import { isValidLocalDate } from '@/lib/time';

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(3, 'Enter a street address.').max(200),
  district: z
    .string()
    .trim()
    .min(2, 'Enter your district.')
    .max(100)
    .refine(
      (district) =>
        (restaurantConfig.delivery.supportedDistricts as readonly string[]).includes(district),
      {
        message: `We currently deliver to: ${restaurantConfig.delivery.supportedDistricts.join(', ')}.`,
      },
    ),
  city: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(200).optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your full name.').max(100),
  customerEmail: z.email('Enter a valid email address.').max(200),
  customerPhone: z.string().trim().min(8, 'Enter a valid phone number.').max(20),
  fulfillmentType: z.enum(['pickup', 'delivery']),
  /** Optional restaurant-local datetime from the `datetime-local` control. */
  scheduledFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, 'Invalid scheduled time.')
    .refine((value) => isValidLocalDate(value.slice(0, 10)), 'Invalid scheduled date.')
    .optional()
    .nullable(),
  deliveryAddress: deliveryAddressSchema.optional().nullable(),
  customerNotes: z.string().trim().max(500).optional().nullable(),
  /** Client-generated key; matching retries resume, mismatched reuse is rejected. */
  checkoutKey: z.string().trim().min(8, 'Invalid checkout key.').max(100),
  lines: z.array(z.unknown()).min(1, 'Your cart is empty.').max(20),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

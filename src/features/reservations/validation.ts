/**
 * Reservation input validation (Zod). Applied on the server for both the
 * online form and staff-created bookings.
 */
import { z } from 'zod';
import { restaurantConfig } from '@/config/restaurant';
import { isValidLocalDate } from '@/lib/time';

const maxParty = restaurantConfig.reservation.maxOnlinePartySize;

export const createReservationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a date.')
    .refine(isValidLocalDate, 'Please choose a real calendar date.'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please choose a time.'),
  partySize: z
    .coerce
    .number()
    .int('Party size must be a whole number.')
    .min(1, 'Party size is required.')
    .max(maxParty, `Online bookings support parties of up to ${maxParty}.`),
  name: z.string().trim().min(2, 'Please enter your full name.').max(100),
  email: z.email('Please enter a valid email address.').max(200),
  phone: z
    .string()
    .trim()
    .min(8, 'Please enter a valid phone number.')
    .max(20, 'Please enter a valid phone number.'),
  notes: z.string().trim().max(500, 'Notes must be under 500 characters.').optional().default(''),
  source: z.enum(['online', 'staff']).default('online'),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const reservationTransitionSchema = z.object({
  reservationId: z.string().uuid(),
  toStatus: z.enum(['SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

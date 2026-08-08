/**
 * Reservation domain service: creation, transitions, notifications.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { reservations } from '@/lib/db/schema';
import { AppError, ErrorCodes, parseOrThrow } from '@/lib/errors';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import { sendEmail } from '@/lib/email/resend';
import { reservationConfirmationHtml } from '@/lib/email/templates';
import { allocateReservation, type AllocatedResult } from './allocation';
import {
  createReservationSchema,
  type CreateReservationInput,
} from './validation';
import { assertReservationTransition } from './status';
import { validateAvailabilityRequest } from './availability';

export interface PublicReservationResult {
  confirmationCode: string;
  customerName: string;
  partySize: number;
  startsAtISO: string;
  endsAtISO: string;
  tableName: string;
  tableArea: string;
}

function toPublic(result: AllocatedResult): PublicReservationResult {
  return {
    confirmationCode: result.reservation.confirmationCode,
    customerName: result.reservation.customerName,
    partySize: result.reservation.partySize,
    startsAtISO: result.reservation.startsAt.toISOString(),
    endsAtISO: result.reservation.endsAt.toISOString(),
    tableName: result.table.name,
    tableArea: result.table.area,
  };
}

export async function createReservation(
  rawInput: CreateReservationInput,
): Promise<PublicReservationResult> {
  const input = parseOrThrow(createReservationSchema, rawInput);
  validateAvailabilityRequest(input.date, input.partySize);
  const result = await allocateReservation({
    dateStr: input.date,
    time: input.time,
    partySize: input.partySize,
    customerName: input.name,
    customerEmail: input.email,
    customerPhone: input.phone,
    notes: input.notes,
    source: input.source,
  });

  // Notify the guest — best effort; the reservation is already committed.
  await sendEmail({
    to: input.email,
    subject: `Reservation Confirmed — ${result.reservation.confirmationCode}`,
    html: reservationConfirmationHtml({
      code: result.reservation.confirmationCode,
      name: input.name,
      dateLabel: utcToLocalDate(result.reservation.startsAt),
      time: utcToLocalTime(result.reservation.startsAt),
      partySize: input.partySize,
      tableName: result.table.name,
    }),
  });

  return toPublic(result);
}

export async function transitionReservation(
  reservationId: string,
  toStatus: (typeof reservations.$inferSelect)['status'],
): Promise<void> {
  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId));

  if (!reservation) {
    throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Reservation not found.', { status: 404 });
  }

  assertReservationTransition(reservation.status, toStatus);

  await db.update(reservations).set({ status: toStatus }).where(eq(reservations.id, reservationId));
}

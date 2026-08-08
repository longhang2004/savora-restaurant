/**
 * Transactional table allocation — the double-booking safeguard.
 *
 * Strategy (single small restaurant, correctness over throughput):
 *
 *   BEGIN
 *   LOCK TABLE dining_tables IN SHARE ROW EXCLUSIVE MODE
 *   recompute reservation conflicts for the candidate interval
 *   choose the smallest compatible free table
 *   insert reservation + table assignment
 *   COMMIT
 *
 * Why a table-level lock instead of only SELECT ... FOR UPDATE on rows:
 * a concurrent transaction that only *inserts* into reservations/
 * reservation_tables never modifies dining_tables rows, so row locks
 * would not serialize against it. The table lock is held by every
 * allocation (and conflicts with any FK-triggered ROW SHARE access),
 * so the second transaction blocks until the first commits — then its
 * conflict query (fresh statement snapshot under READ COMMITTED) sees
 * the committed reservation and picks a different table or fails.
 */
import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { restaurantConfig } from '@/config/restaurant';
import { db } from '@/lib/db/client';
import { diningTables, reservationTables, reservations } from '@/lib/db/schema';
import { AppError, ErrorCodes, isUniqueViolation } from '@/lib/errors';
import { isValidLocalDate } from '@/lib/time';
import { generateSlotsForDate } from './slots';
import { OCCUPYING_STATUSES } from './status';
import { selectSmallestTable } from './engine';

export interface AllocateReservationInput {
  dateStr: string; // YYYY-MM-DD, restaurant local
  time: string; // HH:MM, restaurant local
  partySize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  source: 'online' | 'staff';
}

export interface AllocatedResult {
  reservation: typeof reservations.$inferSelect;
  table: {
    id: string;
    name: string;
    capacity: number;
    area: string;
    isPrivate: boolean;
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function generateConfirmationCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export async function allocateReservation(
  input: AllocateReservationInput,
  now: Date = new Date(),
): Promise<AllocatedResult> {
  if (!isValidLocalDate(input.dateStr)) {
    throw new AppError(ErrorCodes.RESERVATION_INVALID_DATE, 'Please choose a valid date.');
  }

  // The requested slot must still exist (not in the past, within service periods).
  const slots = generateSlotsForDate(input.dateStr, now);
  const slot = slots.find((s) => s.time === input.time);
  if (!slot) {
    throw new AppError(
      ErrorCodes.RESERVATION_SLOT_UNAVAILABLE,
      'This time slot is no longer bookable. Please pick another slot.',
      { status: 409 },
    );
  }

  const durationMinutes = restaurantConfig.reservation.durationMinutes;

  // Retry on the astronomically unlikely confirmation-code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const confirmationCode = generateConfirmationCode();
    try {
      return await db.transaction(async (tx) => {
        // Serialize all allocations against each other (see module docs).
        await tx.execute(sql`LOCK TABLE ${diningTables} IN SHARE ROW EXCLUSIVE MODE`);

        const activeTables = await tx
          .select()
          .from(diningTables)
          .where(eq(diningTables.isActive, true));

        if (activeTables.length === 0) {
          throw new AppError(
            ErrorCodes.RESERVATION_SLOT_UNAVAILABLE,
            'We are currently unable to accept online reservations. Please call us instead.',
            { status: 409 },
          );
        }

        const startsAt = slot.startsAt;
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

        // Overlapping reservations that still occupy capacity.
        const overlapping = await tx
          .select({ tableId: reservationTables.tableId })
          .from(reservationTables)
          .innerJoin(reservations, eq(reservationTables.reservationId, reservations.id))
          .where(
            and(
              inArray(reservations.status, OCCUPYING_STATUSES),
              lt(reservations.startsAt, endsAt),
              gt(reservations.endsAt, startsAt),
            ),
          );
        // Smallest compatible free table (discrete capacity, not seat counts).
        const occupiedIds = new Set(overlapping.map((row) => row.tableId));
        const table = selectSmallestTable(activeTables, occupiedIds, input.partySize);

        if (!table) {
          throw new AppError(
            ErrorCodes.RESERVATION_SLOT_UNAVAILABLE,
            'This slot was just booked by another guest. Please choose a different time.',
            { status: 409 },
          );
        }

        const [reservation] = await tx
          .insert(reservations)
          .values({
            confirmationCode,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            partySize: input.partySize,
            startsAt,
            endsAt,
            status: 'CONFIRMED',
            notes: input.notes || null,
            source: input.source,
          })
          .returning();

        await tx.insert(reservationTables).values({
          reservationId: reservation.id,
          tableId: table.id,
        });

        return {
          reservation,
          table: {
            id: table.id,
            name: table.name,
            capacity: table.capacity,
            area: table.area,
            isPrivate: table.isPrivate,
          },
        };
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < 2) continue;
      throw err;
    }
  }
  throw new AppError(ErrorCodes.INTERNAL, 'Could not create the reservation. Please try again.');
}

/**
 * Reservation availability — read path.
 *
 * Exposes customer-friendly availability (available | limited | full)
 * per generated service slot for a date + party size, computed from
 * discrete table capacity and overlapping reservations. Internal table
 * ids are never exposed to customers.
 */
import { and, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { restaurantConfig } from '@/config/restaurant';
import { AppError, ErrorCodes } from '@/lib/errors';
import {
  daysFromTodayLocal,
  getRestaurantToday,
  isValidLocalDate,
} from '@/lib/time';
import { db, type DB } from '@/lib/db/client';
import {
  diningTables,
  reservationTables,
  reservations,
} from '@/lib/db/schema';
import { generateSlotsForDate, type ServiceSlot } from './slots';
import { OCCUPYING_STATUSES } from './status';
import { classifyAvailability, countFreeTables, intervalsOverlap } from './engine';

export type SlotStatus = 'available' | 'limited' | 'full';

export interface AvailabilitySlot {
  time: string;
  periodId: string;
  periodLabel: string;
  status: SlotStatus;
  /** UTC instant of the slot start (client displays local time). */
  startsAtISO: string;
}

export interface AvailabilityResponse {
  date: string;
  partySize: number;
  slots: AvailabilitySlot[];
}

export function validateAvailabilityRequest(date: string, partySize: number) {
  const { maxOnlinePartySize, maxAdvanceDays } = restaurantConfig.reservation;

  if (!isValidLocalDate(date)) {
    throw new AppError(ErrorCodes.RESERVATION_INVALID_DATE, 'Please choose a valid date.');
  }
  if (daysFromTodayLocal(date) < 0) {
    throw new AppError(ErrorCodes.RESERVATION_INVALID_DATE, 'That date is in the past.');
  }
  if (daysFromTodayLocal(date) > maxAdvanceDays) {
    throw new AppError(
      ErrorCodes.RESERVATION_INVALID_DATE,
      `Reservations can be made up to ${maxAdvanceDays} days in advance.`,
    );
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > maxOnlinePartySize) {
    throw new AppError(
      ErrorCodes.RESERVATION_INVALID_PARTY_SIZE,
      `Online bookings support parties of 1–${maxOnlinePartySize}. For larger groups, please contact our events team.`,
    );
  }
}

export async function getAvailability(
  date: string,
  partySize: number,
  now: Date = new Date(),
): Promise<AvailabilityResponse> {
  validateAvailabilityRequest(date, partySize);

  const slots = generateSlotsForDate(date, now);

  // A fully-closed day (no service slots left) has no bookable times.
  if (slots.length === 0) {
    return { date, partySize, slots: [] };
  }

  const slotStarts = slots.map((s) => s.startsAt);

  // All tables that can seat this party (active only).
  const compatibleTables = await db
    .select({
      id: diningTables.id,
      capacity: diningTables.capacity,
      sortOrder: diningTables.sortOrder,
    })
    .from(diningTables)
    .where(and(eq(diningTables.isActive, true), sql`${diningTables.capacity} >= ${partySize}`));

  if (compatibleTables.length === 0) {
    return {
      date,
      partySize,
      slots: slots.map((slot) => toSlot(slot, 'full')),
    };
  }

  // Overlapping reservations that occupy capacity, for every slot at once.
  const overlaps = await db
    .select({
      tableId: reservationTables.tableId,
      startsAt: reservations.startsAt,
      endsAt: reservations.endsAt,
    })
    .from(reservationTables)
    .innerJoin(reservations, eq(reservationTables.reservationId, reservations.id))
    .where(
      and(
        inArray(reservations.status, OCCUPYING_STATUSES),
        // Overlaps at least one candidate slot.
        lt(reservations.startsAt, lastEnd(slots)),
        gt(reservations.endsAt, slotStarts[0]),
      ),
    );

  return {
    date,
    partySize,
    slots: slots.map((slot) => {
      const occupied = overlaps.filter(
        (r) => intervalsOverlap(r.startsAt, r.endsAt, slot.startsAt, slot.endsAt),
      );
      const occupiedIds = new Set(occupied.map((o) => o.tableId));
      const free = countFreeTables(compatibleTables, occupiedIds, partySize);
      return toSlot(slot, classifyAvailability(free));
    }),
  };
}

function toSlot(slot: ServiceSlot, status: SlotStatus): AvailabilitySlot {
  return {
    time: slot.time,
    periodId: slot.periodId,
    periodLabel: slot.periodLabel,
    status,
    startsAtISO: slot.startsAt.toISOString(),
  };
}

function lastEnd(slots: ServiceSlot[]): Date {
  if (slots.length === 0) return new Date(0);
  return slots[slots.length - 1].endsAt;
}

export function getRestaurantTodayForAvailability(): string {
  return getRestaurantToday();
}

export type { DB };

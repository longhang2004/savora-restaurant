/**
 * Reservation lifecycle state machine.
 *
 * Legal transitions are explicit; arbitrary status mutations are rejected.
 * Only CONFIRMED and SEATED reservations occupy table capacity.
 */
import { reservationStatusEnum } from '@/lib/db/schema';
import { AppError, ErrorCodes } from '@/lib/errors';

export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];

export const RESERVATION_STATUSES: ReservationStatus[] = reservationStatusEnum.enumValues;

export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Statuses whose reservations currently occupy dining capacity. */
export const OCCUPYING_STATUSES: ReservationStatus[] = ['CONFIRMED', 'SEATED'];

export function assertReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): void {
  if (from === to) return;
  if (!RESERVATION_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      ErrorCodes.INVALID_RESERVATION_TRANSITION,
      `Cannot move a reservation from ${from} to ${to}.`,
      { status: 409 },
    );
  }
}

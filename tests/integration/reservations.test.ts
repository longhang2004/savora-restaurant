/**
 * Reservation integration tests against real PostgreSQL — including the
 * concurrency test proving two competing bookings cannot double-allocate
 * the same dining resource.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { createTestDb, resetDb, seedMenuFixtures, seedTableFixtures, IDS, TEST_DATE, TEST_TIME } from './helpers';
import { allocateReservation } from '@/features/reservations/allocation';
import { transitionReservation } from '@/features/reservations/service';
import { reservations, reservationTables } from '@/lib/db/schema';
import { AppError, ErrorCodes } from '@/lib/errors';

const { db } = createTestDb();

const customer = {
  customerName: 'Test Guest',
  customerEmail: 'guest@test.dev',
  customerPhone: '+84900000000',
  source: 'online' as const,
};

beforeAll(async () => {
  await resetDb(db);
  await seedMenuFixtures(db);
  await seedTableFixtures(db);
});

beforeEach(async () => {
  await db.delete(reservationTables);
  await db.delete(reservations);
});

describe('transactional reservation allocation', () => {
  it('creates a CONFIRMED reservation on the smallest compatible table', async () => {
    const result = await allocateReservation({
      dateStr: TEST_DATE,
      time: TEST_TIME,
      partySize: 4,
      ...customer,
    });
    expect(result.reservation.status).toBe('CONFIRMED');
    expect(result.reservation.confirmationCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(result.table.name).toBe('T03'); // smallest 4-seat table

    const [row] = await db
      .select({ tableId: reservationTables.tableId })
      .from(reservationTables)
      .where(eq(reservationTables.reservationId, result.reservation.id));
    expect(row.tableId).toBe(IDS.tableT03);
  });

  it('rejects an overlapping booking when no compatible table remains', async () => {
    // P01 is the only 8-seat table: first booking takes it, second must fail.
    const first = await allocateReservation({
      dateStr: TEST_DATE,
      time: TEST_TIME,
      partySize: 8,
      ...customer,
    });
    expect(first.table.name).toBe('P01');

    await expect(
      allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer }),
    ).rejects.toMatchObject({ code: ErrorCodes.RESERVATION_SLOT_UNAVAILABLE });
  });

  it('allows a boundary-touching adjacent booking (no overlap)', async () => {
    await allocateReservation({ dateStr: TEST_DATE, time: '18:00', partySize: 8, ...customer });
    // Adjacent slot: 20:00–22:00 vs 18:00–20:00 — no overlap.
    const result = await allocateReservation({ dateStr: TEST_DATE, time: '20:00', partySize: 8, ...customer });
    expect(result.reservation.status).toBe('CONFIRMED');
  });

  it('frees capacity when a reservation is cancelled', async () => {
    const first = await allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer });
    await transitionReservation(first.reservation.id, 'CANCELLED');

    const again = await allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer });
    expect(again.table.name).toBe('P01');
  });

  it('ignores completed/no-show reservations when allocating capacity', async () => {
    const occupied = await allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer });
    // Walk through the full lifecycle to COMPLETED.
    await transitionReservation(occupied.reservation.id, 'SEATED');
    await transitionReservation(occupied.reservation.id, 'COMPLETED');

    const result = await allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer });
    expect(result.table.name).toBe('P01');
  });

  it('rejects a party size with no compatible table', async () => {
    await expect(
      allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 12, ...customer }),
    ).rejects.toMatchObject({ code: ErrorCodes.RESERVATION_SLOT_UNAVAILABLE });
  });

  describe('concurrency — no double booking', () => {
    it('exactly one of two competing requests for the same slot wins', async () => {
      // P01 is the only table for 8 guests: two simultaneous requests for
      // the same slot must result in exactly one reservation.
      const attempt = () =>
        allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 8, ...customer });

      const [a, b] = await Promise.allSettled([attempt(), attempt()]);

      const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
      const rejected = [a, b].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
        code: ErrorCodes.RESERVATION_SLOT_UNAVAILABLE,
      });

      const [{ count: total }] = await db
        .select({ count: count() })
        .from(reservations);
      expect(total).toBe(1);
      const [{ count: assignments }] = await db
        .select({ count: count() })
        .from(reservationTables);
      expect(assignments).toBe(1);
    });

    it('still serializes correctly across multiple concurrent parties', async () => {
      // 8 parties of 2 guests racing for the same slot; only T01+T02 exist
      // for size 2 in this fixture set... all six tables fit a party of 2,
      // so exactly 6 should succeed.
      const attempts = Array.from({ length: 8 }, () =>
        allocateReservation({ dateStr: TEST_DATE, time: TEST_TIME, partySize: 2, ...customer }),
      );
      const results = await Promise.allSettled(attempts);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(6);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);

      const [{ count: total }] = await db.select({ count: count() }).from(reservations);
      expect(total).toBe(6);
      const assignments = await db.select().from(reservationTables);
      const tableIds = new Set(assignments.map((a) => a.tableId));
      expect(tableIds.size).toBe(6); // no table allocated twice
    });
  });
});

describe('reservation status transitions (DB-backed)', () => {
  it('walks CONFIRMED → SEATED → COMPLETED', async () => {
    const { reservation } = await allocateReservation({
      dateStr: TEST_DATE,
      time: TEST_TIME,
      partySize: 2,
      ...customer,
    });
    await transitionReservation(reservation.id, 'SEATED');
    await transitionReservation(reservation.id, 'COMPLETED');

    const [row] = await db.select().from(reservations).where(eq(reservations.id, reservation.id));
    expect(row.status).toBe('COMPLETED');
  });

  it('rejects illegal transitions', async () => {
    const { reservation } = await allocateReservation({
      dateStr: TEST_DATE,
      time: TEST_TIME,
      partySize: 2,
      ...customer,
    });
    await expect(transitionReservation(reservation.id, 'COMPLETED')).rejects.toBeInstanceOf(AppError);
    await expect(transitionReservation(reservation.id, 'NO_SHOW')).resolves.toBeUndefined();
    // NO_SHOW is terminal
    await expect(transitionReservation(reservation.id, 'SEATED')).rejects.toBeInstanceOf(AppError);
  });
});

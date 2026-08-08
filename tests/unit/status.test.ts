import { describe, expect, it } from 'vitest';
import {
  assertReservationTransition,
  OCCUPYING_STATUSES,
  RESERVATION_TRANSITIONS,
} from '@/features/reservations/status';
import { assertOrderTransition, ORDER_TRANSITIONS } from '@/features/orders/status';
import { AppError, ErrorCodes } from '@/lib/errors';

describe('reservation status transitions', () => {
  it('allows the documented legal transitions', () => {
    assertReservationTransition('CONFIRMED', 'SEATED');
    assertReservationTransition('CONFIRMED', 'CANCELLED');
    assertReservationTransition('CONFIRMED', 'NO_SHOW');
    assertReservationTransition('SEATED', 'COMPLETED');
  });

  it('rejects illegal transitions', () => {
    for (const [from, to] of [
      ['SEATED', 'CANCELLED'],
      ['COMPLETED', 'SEATED'],
      ['CANCELLED', 'CONFIRMED'],
      ['NO_SHOW', 'COMPLETED'],
      ['CONFIRMED', 'COMPLETED'], // must pass through SEATED
    ] as const) {
      expect(() => assertReservationTransition(from, to)).toThrowError(AppError);
      try {
        assertReservationTransition(from, to);
      } catch (err) {
        expect((err as AppError).code).toBe(ErrorCodes.INVALID_RESERVATION_TRANSITION);
      }
    }
  });

  it('keeps only capacity-occupying statuses in OCCUPYING_STATUSES', () => {
    expect(OCCUPYING_STATUSES).toEqual(['CONFIRMED', 'SEATED']);
    // cancelled/completed/no-show must never block future allocation
    expect(OCCUPYING_STATUSES).not.toContain('CANCELLED');
    expect(OCCUPYING_STATUSES).not.toContain('COMPLETED');
    expect(OCCUPYING_STATUSES).not.toContain('NO_SHOW');
  });

  it('declares a transition map for every status', () => {
    const statuses: (keyof typeof RESERVATION_TRANSITIONS)[] = [
      'CONFIRMED',
      'SEATED',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ];
    for (const status of statuses) {
      expect(Array.isArray(RESERVATION_TRANSITIONS[status])).toBe(true);
    }
  });
});

describe('order status transitions', () => {
  it('allows forward fulfillment flow', () => {
    assertOrderTransition('NEW', 'ACCEPTED');
    assertOrderTransition('ACCEPTED', 'PREPARING');
    assertOrderTransition('PREPARING', 'READY');
    assertOrderTransition('READY', 'COMPLETED');
  });

  it('allows cancellation from active states only', () => {
    assertOrderTransition('NEW', 'CANCELLED');
    assertOrderTransition('PREPARING', 'CANCELLED');
    expect(() => assertOrderTransition('COMPLETED', 'CANCELLED')).toThrowError(AppError);
    expect(() => assertOrderTransition('CANCELLED', 'NEW')).toThrowError(AppError);
  });

  it('only allows PENDING → NEW (payment confirmation), never manually', () => {
    expect(() => assertOrderTransition('PENDING', 'ACCEPTED')).toThrowError(AppError);
    assertOrderTransition('PENDING', 'NEW');
  });

  it('declares a transition map for every status', () => {
    const statuses: (keyof typeof ORDER_TRANSITIONS)[] = [
      'PENDING',
      'NEW',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(Array.isArray(ORDER_TRANSITIONS[status])).toBe(true);
    }
  });
});

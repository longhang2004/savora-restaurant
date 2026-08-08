/**
 * Reservation server actions (public form + admin transitions).
 */
'use server';

import { revalidatePath } from 'next/cache';
import { parseOrThrow, toErrorResult, toSuccessResult } from '@/lib/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { createReservation, transitionReservation } from './service';
import { reservationTransitionSchema, type CreateReservationInput } from './validation';

export async function createReservationAction(input: CreateReservationInput) {
  try {
    const data = await createReservation(input);
    revalidatePath('/reservations');
    return toSuccessResult(data);
  } catch (err) {
    return toErrorResult(err);
  }
}

export async function transitionReservationAction(input: {
  reservationId: string;
  toStatus: string;
}) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(reservationTransitionSchema, input);
    await transitionReservation(parsed.reservationId, parsed.toStatus);
    revalidatePath('/admin/reservations');
    revalidatePath('/admin');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

/**
 * Order lifecycle state machine.
 *
 * Fulfillment state and payment state are separate (an order can be
 * PAID while still PREPARING). Transitions are explicit.
 */
import { orderStatusEnum } from '@/lib/db/schema';
import { AppError, ErrorCodes } from '@/lib/errors';

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const ORDER_STATUSES: OrderStatus[] = orderStatusEnum.enumValues;

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['NEW', 'CANCELLED'], // NEW happens via confirmed payment
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  if (!ORDER_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      ErrorCodes.INVALID_ORDER_TRANSITION,
      `Cannot move an order from ${from} to ${to}.`,
      { status: 409 },
    );
  }
}

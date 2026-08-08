/**
 * Admin operations: order fulfillment, menu CMS, staff reservations.
 *
 * Every mutation authorizes server-side via requireAdmin() and validates
 * legal state transitions.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import {
  menuItemModifierGroups,
  menuItems,
  modifierGroups,
  modifierOptions,
  orders,
} from '@/lib/db/schema';
import { AppError, ErrorCodes, parseOrThrow, toErrorResult, toSuccessResult } from '@/lib/errors';
import { requireAdmin } from '@/lib/auth/guards';
import { assertOrderTransition } from '@/features/orders/status';
import { createReservation } from '@/features/reservations/service';
import { createReservationSchema } from '@/features/reservations/validation';

// ─── Order fulfillment ────────────────────────────────────────────────

const orderTransitionSchema = z.object({
  orderId: z.string().uuid(),
  toStatus: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
});

export async function transitionOrderAction(input: { orderId: string; toStatus: string }) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(orderTransitionSchema, input);

    const [order] = await db.select().from(orders).where(eq(orders.id, parsed.orderId));
    if (!order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, 'Order not found.', { status: 404 });
    }
    assertOrderTransition(order.status, parsed.toStatus);

    await db.update(orders).set({ status: parsed.toStatus }).where(eq(orders.id, parsed.orderId));
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

// ─── Menu CMS ─────────────────────────────────────────────────────────

const menuItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  priceCents: z.coerce.number().int().min(0).max(10_000_000),
  categoryId: z.string().uuid(),
  isFeatured: z.coerce.boolean(),
  isAvailable: z.coerce.boolean(),
});

export async function updateMenuItemAction(input: z.infer<typeof menuItemSchema>) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(menuItemSchema, input);
    await db
      .update(menuItems)
      .set({
        name: parsed.name,
        description: parsed.description,
        priceCents: parsed.priceCents,
        categoryId: parsed.categoryId,
        isFeatured: parsed.isFeatured,
        isAvailable: parsed.isAvailable,
      })
      .where(eq(menuItems.id, parsed.itemId));
    revalidatePath('/admin/menu');
    revalidatePath('/menu');
    revalidatePath('/');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

const menuItemAvailabilitySchema = z.object({
  itemId: z.string().uuid(),
  isAvailable: z.coerce.boolean(),
});

export async function setMenuItemAvailabilityAction(input: { itemId: string; isAvailable: boolean }) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(menuItemAvailabilitySchema, input);
    await db
      .update(menuItems)
      .set({ isAvailable: parsed.isAvailable })
      .where(eq(menuItems.id, parsed.itemId));
    revalidatePath('/admin/menu');
    revalidatePath('/menu');
    revalidatePath('/');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

const modifierGroupSchema = z.object({
  itemId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  minSelections: z.coerce.number().int().min(0).max(10),
  maxSelections: z.coerce.number().int().min(1).max(10),
  isRequired: z.coerce.boolean(),
  options: z
    .array(
      z.object({
        optionId: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        priceDeltaCents: z.coerce.number().int().min(-10_000_000).max(10_000_000),
        isAvailable: z.coerce.boolean(),
      }),
    )
    .max(20),
});

export async function saveModifierGroupAction(input: z.infer<typeof modifierGroupSchema>) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(modifierGroupSchema, input);

    if (parsed.maxSelections < parsed.minSelections) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Max selections must be ≥ min selections.');
    }

    await db.transaction(async (tx) => {
      let groupId = parsed.groupId;
      if (groupId) {
        await tx
          .update(modifierGroups)
          .set({
            name: parsed.name,
            minSelections: parsed.minSelections,
            maxSelections: parsed.maxSelections,
            isRequired: parsed.isRequired,
          })
          .where(eq(modifierGroups.id, groupId));

        // Replace options wholesale inside the same transaction as the group update.
        const existing = await tx
          .select({ id: modifierOptions.id })
          .from(modifierOptions)
          .where(eq(modifierOptions.modifierGroupId, groupId));
        const keep = parsed.options.filter((o) => o.optionId).map((o) => o.optionId!);
        const toDelete = existing.filter((o) => !keep.includes(o.id));
        if (toDelete.length) {
          await tx
            .delete(modifierOptions)
            .where(inArray(modifierOptions.id, toDelete.map((o) => o.id)));
        }
        for (const option of parsed.options) {
          if (option.optionId) {
            await tx
              .update(modifierOptions)
              .set({
                name: option.name,
                priceDeltaCents: option.priceDeltaCents,
                isAvailable: option.isAvailable,
              })
              .where(and(eq(modifierOptions.id, option.optionId), eq(modifierOptions.modifierGroupId, groupId)));
          } else {
            await tx.insert(modifierOptions).values({
              modifierGroupId: groupId,
              name: option.name,
              priceDeltaCents: option.priceDeltaCents,
              isAvailable: option.isAvailable,
            });
          }
        }
      } else {
        const [group] = await tx
          .insert(modifierGroups)
          .values({
            name: parsed.name,
            minSelections: parsed.minSelections,
            maxSelections: parsed.maxSelections,
            isRequired: parsed.isRequired,
          })
          .returning();
        groupId = group.id;
        await tx.insert(menuItemModifierGroups).values({
          menuItemId: parsed.itemId,
          modifierGroupId: group.id,
        });
        for (const option of parsed.options) {
          await tx.insert(modifierOptions).values({
            modifierGroupId: group.id,
            name: option.name,
            priceDeltaCents: option.priceDeltaCents,
            isAvailable: option.isAvailable,
          });
        }
      }
    });

    revalidatePath('/admin/menu');
    revalidatePath('/menu');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

const deleteModifierGroupSchema = z.object({
  groupId: z.string().uuid(),
});

export async function deleteModifierGroupAction(input: { groupId: string }) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(deleteModifierGroupSchema, input);
    await db.delete(modifierGroups).where(eq(modifierGroups.id, parsed.groupId));
    revalidatePath('/admin/menu');
    revalidatePath('/menu');
    return toSuccessResult({ ok: true });
  } catch (err) {
    return toErrorResult(err);
  }
}

// ─── Staff-created reservations (reuses the same allocation engine) ───

const staffReservationSchema = createReservationSchema.extend({
  source: z.literal('staff'),
});

export async function createStaffReservationAction(input: z.infer<typeof staffReservationSchema>) {
  try {
    await requireAdmin();
    const parsed = parseOrThrow(staffReservationSchema, input);
    const data = await createReservation({ ...parsed, source: 'staff' });
    revalidatePath('/admin/reservations');
    revalidatePath('/admin');
    return toSuccessResult(data);
  } catch (err) {
    return toErrorResult(err);
  }
}

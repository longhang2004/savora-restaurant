/**
 * Server-authoritative cart pricing & validation.
 *
 * The browser is never the source of truth for price: items, modifiers
 * and availability are reloaded from the database and everything is
 * recomputed on the server.
 */
import 'server-only';
import { AppError, ErrorCodes } from '@/lib/errors';
import { getMenuItemsByIds } from '@/features/menu/queries';
import { validateModifiers, type ResolvedModifier } from '@/features/menu/modifiers';

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_INSTRUCTIONS_LENGTH = 200;

export interface CartLineInput {
  menuItemId: string;
  modifierOptionIds: string[];
  quantity: number;
  specialInstructions?: string;
}

export interface PricedLine {
  menuItemId: string;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  specialInstructions: string | null;
  modifiers: ResolvedModifier[];
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
}

export function validateCartLineShape(line: unknown): CartLineInput {
  if (typeof line !== 'object' || line === null) throw invalidCart();
  const { menuItemId, modifierOptionIds, quantity, specialInstructions } = line as Record<
    string,
    unknown
  >;
  if (typeof menuItemId !== 'string' || menuItemId.length === 0) throw invalidCart();
  if (!Array.isArray(modifierOptionIds) || modifierOptionIds.some((id) => typeof id !== 'string')) {
    throw invalidCart();
  }
  const qty = typeof quantity === 'number' ? quantity : NaN;
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_LINE) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      `Each item allows 1–${MAX_QUANTITY_PER_LINE} units per line.`,
    );
  }
  const instructions =
    typeof specialInstructions === 'string' && specialInstructions.trim().length > 0
      ? specialInstructions.trim().slice(0, MAX_INSTRUCTIONS_LENGTH)
      : undefined;
  return { menuItemId, modifierOptionIds, quantity: qty, specialInstructions: instructions };
}

export async function priceAndValidateCart(lines: CartLineInput[]): Promise<PricedCart> {
  if (lines.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Your cart is empty.');
  }

  const uniqueIds = [...new Set(lines.map((l) => l.menuItemId))];
  const menu = await getMenuItemsByIds(uniqueIds);
  const itemById = new Map(menu.map((item) => [item.id, item]));

  const priced: PricedLine[] = [];
  let subtotalCents = 0;

  for (const line of lines) {
    const item = itemById.get(line.menuItemId);
    if (!item) {
      throw new AppError(ErrorCodes.MENU_ITEM_NOT_FOUND, 'An item in your cart no longer exists.', {
        status: 409,
      });
    }
    if (!item.isAvailable) {
      throw new AppError(
        ErrorCodes.MENU_ITEM_UNAVAILABLE,
        `"${item.name}" is currently sold out. Please remove it from your cart.`,
        { status: 409 },
      );
    }

    const modifiers = validateModifiers(item, item.modifierGroups, line.modifierOptionIds);
    const unitPriceCents =
      item.priceCents + modifiers.reduce((sum, m) => sum + m.priceDeltaCents, 0);
    const lineTotalCents = unitPriceCents * line.quantity;

    subtotalCents += lineTotalCents;
    priced.push({
      menuItemId: item.id,
      itemName: item.name,
      unitPriceCents,
      quantity: line.quantity,
      lineTotalCents,
      specialInstructions: line.specialInstructions ?? null,
      modifiers,
    });
  }

  return { lines: priced, subtotalCents };
}

function invalidCart(): AppError {
  return new AppError(ErrorCodes.VALIDATION_FAILED, 'Your cart contains invalid items.');
}

import { describe, expect, it } from 'vitest';
import { validateModifiers } from '@/features/menu/modifiers';
import type { PublicModifierGroup } from '@/features/menu/queries';
import { AppError, ErrorCodes } from '@/lib/errors';

const item = { id: 'item-1', name: 'Wagyu Beef Phở' };

const sizeGroup: PublicModifierGroup = {
  id: 'g-size',
  name: 'Size',
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [
    { id: 'o-regular', name: 'Regular', priceDeltaCents: 0, isAvailable: true },
    { id: 'o-large', name: 'Large', priceDeltaCents: 800, isAvailable: true },
  ],
};

const extrasGroup: PublicModifierGroup = {
  id: 'g-extras',
  name: 'Extras',
  minSelections: 0,
  maxSelections: 2,
  isRequired: false,
  options: [
    { id: 'o-wagyu', name: 'Extra Wagyu', priceDeltaCents: 1200, isAvailable: true },
    { id: 'o-egg', name: 'Soft Egg', priceDeltaCents: 200, isAvailable: true },
    { id: 'o-noodles', name: 'Extra Noodles', priceDeltaCents: 300, isAvailable: false },
  ],
};

const groups = [sizeGroup, extrasGroup];

describe('modifier validation (server-side)', () => {
  it('accepts a valid selection and resolves deltas', () => {
    const resolved = validateModifiers(item, groups, ['o-large', 'o-wagyu']);
    expect(resolved).toHaveLength(2);
    expect(resolved.find((r) => r.optionId === 'o-large')?.priceDeltaCents).toBe(800);
    expect(resolved.find((r) => r.optionId === 'o-wagyu')?.priceDeltaCents).toBe(1200);
    expect(resolved[0].groupName).toBe('Size');
  });

  it('rejects an option that does not belong to the product', () => {
    try {
      validateModifiers(item, groups, ['o-regular', 'foreign-option']);
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe(ErrorCodes.INVALID_MODIFIER_SELECTION);
    }
  });

  it('rejects an option that exists elsewhere but not in this item (cross-product)', () => {
    // o-lava belongs to another product's group — this item's groups are
    // assembled per-product from the DB (menu_item_modifier_groups), so a
    // client submitting another product's option id must be rejected.
    const foreignOptionId = 'o-lava';
    try {
      validateModifiers(item, groups, ['o-regular', foreignOptionId]);
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe(ErrorCodes.INVALID_MODIFIER_SELECTION);
    }
  });

  it('rejects an unavailable option', () => {
    try {
      validateModifiers(item, groups, ['o-regular', 'o-noodles']);
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe(ErrorCodes.INVALID_MODIFIER_SELECTION);
    }
  });

  it('rejects a missing required selection', () => {
    try {
      validateModifiers(item, groups, []);
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe(ErrorCodes.INVALID_MODIFIER_SELECTION);
    }
  });

  it('rejects exceeding max selections', () => {
    try {
      validateModifiers(item, groups, ['o-regular', 'o-wagyu', 'o-egg']); // 2 extras > max 2? = 2 ok
      validateModifiers(item, groups, ['o-regular', 'o-wagyu', 'o-egg', 'o-egg']); // 3 > 2
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe(ErrorCodes.INVALID_MODIFIER_SELECTION);
    }
  });

  it('rejects duplicate option ids instead of charging the same option twice', () => {
    expect(() =>
      validateModifiers(item, groups, ['o-regular', 'o-wagyu', 'o-wagyu']),
    ).toThrowError(AppError);
  });

  it('respects min selections for optional groups when declared', () => {
    const minTwo: PublicModifierGroup = {
      id: 'g-min2',
      name: 'Sides',
      minSelections: 2,
      maxSelections: 3,
      isRequired: false,
      options: [
        { id: 's1', name: 'A', priceDeltaCents: 0, isAvailable: true },
        { id: 's2', name: 'B', priceDeltaCents: 0, isAvailable: true },
        { id: 's3', name: 'C', priceDeltaCents: 0, isAvailable: true },
      ],
    };
    const ok = validateModifiers(item, [minTwo], ['s1', 's2']);
    expect(ok).toHaveLength(2);
    expect(() => validateModifiers(item, [minTwo], ['s1'])).toThrowError(AppError);
  });
});

/**
 * Public menu queries (database-backed).
 */
import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  menuCategories,
  menuItemModifierGroups,
  menuItems,
  modifierGroups,
  modifierOptions,
} from '@/lib/db/schema';

export interface PublicModifierOption {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
}

export interface PublicModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: PublicModifierOption[];
}

export interface PublicMenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imagePath: string | null;
  category: { id: string; slug: string; name: string };
  dietaryTags: string[];
  isFeatured: boolean;
  isAvailable: boolean;
  modifierGroups: PublicModifierGroup[];
}

export interface PublicMenuCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface PublicMenu {
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
}

/** Load the whole menu (categories + items + modifier groups/options). */
export async function getPublicMenu(): Promise<PublicMenu> {
  const [categories, items, links, groups, options] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.isActive, true))
      .orderBy(asc(menuCategories.sortOrder)),
    db
      .select()
      .from(menuItems)
      .orderBy(asc(menuItems.sortOrder)),
    db.select().from(menuItemModifierGroups),
    db.select().from(modifierGroups),
    db.select().from(modifierOptions),
  ]);

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const optionsByGroup = new Map<string, PublicModifierOption[]>();
  for (const option of [...options].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = optionsByGroup.get(option.modifierGroupId) ?? [];
    list.push({
      id: option.id,
      name: option.name,
      priceDeltaCents: option.priceDeltaCents,
      isAvailable: option.isAvailable,
    });
    optionsByGroup.set(option.modifierGroupId, list);
  }

  const groupsByItem = new Map<string, PublicModifierGroup[]>();
  for (const link of links) {
    const group = groupById.get(link.modifierGroupId);
    if (!group) continue;
    const list = groupsByItem.get(link.menuItemId) ?? [];
    list.push({
      id: group.id,
      name: group.name,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      isRequired: group.isRequired,
      options: optionsByGroup.get(group.id) ?? [],
    });
    groupsByItem.set(link.menuItemId, list);
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
    })),
    items: items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      imagePath: item.imagePath,
      category: (() => {
        const c = categoryById.get(item.categoryId);
        return { id: item.categoryId, slug: c?.slug ?? 'unknown', name: c?.name ?? 'Other' };
      })(),
      dietaryTags: item.dietaryTags,
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      modifierGroups: (groupsByItem.get(item.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    })),
  };
}

export async function getFeaturedMenuItems(limit = 3): Promise<PublicMenuItem[]> {
  const menu = await getPublicMenu();
  return menu.items.filter((item) => item.isFeatured && item.isAvailable).slice(0, limit);
}

export async function getMenuItemsByIds(ids: string[]): Promise<PublicMenuItem[]> {
  if (ids.length === 0) return [];
  const menu = await getPublicMenu();
  const wanted = new Set(ids);
  return menu.items.filter((item) => wanted.has(item.id));
}

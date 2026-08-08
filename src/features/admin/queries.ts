/**
 * Admin read models (reservations board, orders board, dashboard).
 */
import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  diningTables,
  menuCategories,
  menuItemModifierGroups,
  menuItems,
  modifierGroups,
  modifierOptions,
  orderItemModifiers,
  orderItems,
  orders,
  payments,
  reservationTables,
  reservations,
} from '@/lib/db/schema';
import { localDayBounds, utcToLocalDate } from '@/lib/time';

// ─── Reservations ─────────────────────────────────────────────────────

export interface ReservationRow {
  id: string;
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  startsAt: Date;
  endsAt: Date;
  status: typeof reservations.$inferSelect['status'];
  notes: string | null;
  source: 'online' | 'staff';
  tables: { id: string; name: string; capacity: number; area: string; isPrivate: boolean }[];
}

export async function getReservationsForRange(
  start: Date,
  end: Date,
  orderDir: 'asc' | 'desc' = 'asc',
): Promise<ReservationRow[]> {
  const rows = await db
    .select()
    .from(reservations)
    .where(and(gte(reservations.startsAt, start), lt(reservations.startsAt, end)))
    .orderBy(orderDir === 'asc' ? asc(reservations.startsAt) : desc(reservations.startsAt));

  return attachTableNames(rows);
}

export async function getUpcomingReservations(limit = 20): Promise<ReservationRow[]> {
  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(
        gte(reservations.startsAt, new Date()),
        inArray(reservations.status, ['CONFIRMED', 'SEATED']),
      ),
    )
    .orderBy(asc(reservations.startsAt))
    .limit(limit);
  return attachTableNames(rows);
}

export async function getPastReservations(limit = 20): Promise<ReservationRow[]> {
  const rows = await db
    .select()
    .from(reservations)
    .where(lt(reservations.startsAt, new Date()))
    .orderBy(desc(reservations.startsAt))
    .limit(limit);
  return attachTableNames(rows);
}

async function attachTableNames(rows: typeof reservations.$inferSelect[]): Promise<ReservationRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const assignments = await db
    .select({
      reservationId: reservationTables.reservationId,
      tableId: reservationTables.tableId,
      name: diningTables.name,
      capacity: diningTables.capacity,
      area: diningTables.area,
      isPrivate: diningTables.isPrivate,
    })
    .from(reservationTables)
    .innerJoin(diningTables, eq(reservationTables.tableId, diningTables.id))
    .where(inArray(reservationTables.reservationId, ids));

  const tablesByReservation = new Map<string, ReservationRow['tables']>();
  for (const a of assignments) {
    const list = tablesByReservation.get(a.reservationId) ?? [];
    list.push({ id: a.tableId, name: a.name, capacity: a.capacity, area: a.area, isPrivate: a.isPrivate });
    tablesByReservation.set(a.reservationId, list);
  }

  return rows.map((r) => ({
    ...r,
    tables: tablesByReservation.get(r.id) ?? [],
  }));
}

export function getTodayBounds(): { start: Date; end: Date } {
  return localDayBounds(utcToLocalDate(new Date()));
}

// ─── Orders ───────────────────────────────────────────────────────────

export interface OrderRow {
  order: typeof orders.$inferSelect;
  items: (typeof orderItems.$inferSelect & { modifiers: typeof orderItemModifiers.$inferSelect[] })[];
}

export async function getOrdersByStatus(
  statuses: (typeof orders.$inferSelect['status'])[],
  limit = 50,
): Promise<OrderRow[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, statuses))
    .orderBy(asc(orders.createdAt))
    .limit(limit);
  return attachOrderDetails(rows);
}

export async function getRecentOrders(limit = 20): Promise<OrderRow[]> {
  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return attachOrderDetails(rows);
}

async function attachOrderDetails(rows: typeof orders.$inferSelect[]): Promise<OrderRow[]> {
  if (rows.length === 0) return [];
  const orderIds = rows.map((o) => o.id);
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  const itemIds = items.map((i) => i.id);
  const modifiers = itemIds.length
    ? await db.select().from(orderItemModifiers).where(inArray(orderItemModifiers.orderItemId, itemIds))
    : [];

  const modsByItem = new Map<string, typeof orderItemModifiers.$inferSelect[]>();
  for (const m of modifiers) {
    const list = modsByItem.get(m.orderItemId) ?? [];
    list.push(m);
    modsByItem.set(m.orderItemId, list);
  }
  const itemsByOrder = new Map<string, (typeof orderItems.$inferSelect & { modifiers: typeof orderItemModifiers.$inferSelect[] })[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({ ...item, modifiers: modsByItem.get(item.id) ?? [] });
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((order) => ({
    order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

// ─── Dashboard ────────────────────────────────────────────────────────

export async function getDashboardMetrics(now: Date = new Date()) {
  const { start, end } = localDayBounds(utcToLocalDate(now));

  const [paidTodayRows, reservationCountRow, recentOrders, todayReservations] = await Promise.all([
      db
        .select({
          orderId: payments.orderId,
          amountCents: payments.amountCents,
        })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(
          and(
            eq(payments.status, 'paid'),
            eq(orders.paymentStatus, 'PAID'),
            gte(payments.createdAt, start),
            lt(payments.createdAt, end),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(reservations)
        .where(
          and(
            gte(reservations.startsAt, start),
            lt(reservations.startsAt, end),
            inArray(reservations.status, ['CONFIRMED', 'SEATED', 'COMPLETED']),
          ),
        ),
      getRecentOrders(5),
      getReservationsForRange(start, end),
    ]);

  // A retry or webhook replay must not make one order count twice. The payment
  // row is the timestamped record of when the order became paid.
  const paidByOrder = new Map<string, number>();
  for (const row of paidTodayRows) {
    if (!paidByOrder.has(row.orderId)) paidByOrder.set(row.orderId, row.amountCents);
  }
  const revenueTodayCents = [...paidByOrder.values()].reduce((sum, amount) => sum + amount, 0);
  const paidOrdersToday = paidByOrder.size;

  return {
    revenueTodayCents,
    paidOrdersToday,
    reservationsToday: reservationCountRow[0]?.count ?? 0,
    averageOrderValueCents: paidOrdersToday
      ? Math.round(revenueTodayCents / paidOrdersToday)
      : 0,
    recentOrders,
    todayReservations,
  };
}

// ─── Menu admin ───────────────────────────────────────────────────────

export interface AdminMenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  imagePath: string | null;
  categoryId: string;
  dietaryTags: string[];
  isFeatured: boolean;
  isAvailable: boolean;
  modifierGroups: {
    id: string;
    name: string;
    minSelections: number;
    maxSelections: number;
    isRequired: boolean;
    options: {
      id: string;
      name: string;
      priceDeltaCents: number;
      isAvailable: boolean;
      sortOrder: number;
    }[];
  }[];
}

export async function getMenuForAdmin(): Promise<{
  categories: { id: string; name: string; slug: string }[];
  items: AdminMenuItem[];
}> {
  const [categories, items, links, groups, options] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)),
    db.select().from(menuItems).orderBy(asc(menuItems.sortOrder)),
    db.select().from(menuItemModifierGroups),
    db.select().from(modifierGroups).orderBy(asc(modifierGroups.sortOrder)),
    db.select().from(modifierOptions).orderBy(asc(modifierOptions.sortOrder)),
  ]);

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const optionsByGroup = new Map<string, AdminMenuItem['modifierGroups'][number]['options']>();
  for (const o of options) {
    const list = optionsByGroup.get(o.modifierGroupId) ?? [];
    list.push({
      id: o.id,
      name: o.name,
      priceDeltaCents: o.priceDeltaCents,
      isAvailable: o.isAvailable,
      sortOrder: o.sortOrder,
    });
    optionsByGroup.set(o.modifierGroupId, list);
  }
  const groupsByItem = new Map<string, AdminMenuItem['modifierGroups']>();
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

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      priceCents: item.priceCents,
      imagePath: item.imagePath,
      categoryId: item.categoryId,
      dietaryTags: item.dietaryTags,
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      modifierGroups: groupsByItem.get(item.id) ?? [],
    })),
  };
}

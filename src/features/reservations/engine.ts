/**
 * Pure availability/allocation decision logic — no I/O, fully unit-testable.
 *
 * The database-backed paths (availability.ts, allocation.ts) delegate the
 * tricky decisions here so the business rules can be verified directly.
 */

export interface TableLike {
  id: string;
  capacity: number;
  sortOrder: number;
}

/** Interval overlap + selection helpers, generic over richer table rows. */
export function selectSmallestTable<T extends TableLike>(
  tables: T[],
  occupiedIds: ReadonlySet<string>,
  partySize: number,
): T | null {
  const candidates = tables
    .filter((table) => table.capacity >= partySize && !occupiedIds.has(table.id))
    .sort((a, b) => a.capacity - b.capacity || a.sortOrder - b.sortOrder);
  return candidates[0] ?? null;
}

/** Number of compatible tables not currently occupied. */
export function countFreeTables(
  tables: TableLike[],
  occupiedIds: ReadonlySet<string>,
  partySize: number,
): number {
  return tables.filter(
    (table) => table.capacity >= partySize && !occupiedIds.has(table.id),
  ).length;
}

/**
 * Public classification policy:
 *   0 compatible resources → full
 *   1 compatible resource  → limited
 *   2+ compatible resources → available
 */
export function classifyAvailability(freeCount: number): 'available' | 'limited' | 'full' {
  if (freeCount <= 0) return 'full';
  if (freeCount === 1) return 'limited';
  return 'available';
}

/** Classic interval overlap: a reservation conflicts only when both bounds cross. */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

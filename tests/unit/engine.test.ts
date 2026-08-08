import { describe, expect, it } from 'vitest';
import {
  classifyAvailability,
  countFreeTables,
  intervalsOverlap,
  selectSmallestTable,
  type TableLike,
} from '@/features/reservations/engine';

const tables: TableLike[] = [
  { id: 'T01', capacity: 2, sortOrder: 10 },
  { id: 'T02', capacity: 2, sortOrder: 20 },
  { id: 'T03', capacity: 4, sortOrder: 30 },
  { id: 'T04', capacity: 4, sortOrder: 40 },
  { id: 'T05', capacity: 6, sortOrder: 50 },
  { id: 'P01', capacity: 8, sortOrder: 60 },
];

const at = (h: number, m = 0) => new Date(2026, 7, 10, h, m);

describe('interval overlap', () => {
  it('detects overlapping reservations', () => {
    // 18:00–20:00 vs 19:00–21:00
    expect(intervalsOverlap(at(18), at(20), at(19), at(21))).toBe(true);
    // identical intervals
    expect(intervalsOverlap(at(18), at(20), at(18), at(20))).toBe(true);
  });

  it('treats boundary-touching reservations as non-conflicting', () => {
    // 18:00–20:00 vs 20:00–22:00 (adjacent, no overlap)
    expect(intervalsOverlap(at(18), at(20), at(20), at(22))).toBe(false);
    // contained entirely before
    expect(intervalsOverlap(at(18), at(20), at(15), at(18))).toBe(false);
  });
});

describe('smallest-table selection', () => {
  it('picks the smallest table that fits the party', () => {
    const picked = selectSmallestTable(tables, new Set(), 4);
    expect(picked?.id).toBe('T03'); // not T05/T06 (too big)
  });

  it('respects occupied tables', () => {
    const occupied = new Set(['T03']);
    const picked = selectSmallestTable(tables, occupied, 4);
    expect(picked?.id).toBe('T04');
  });

  it('returns null when no table fits the party', () => {
    const picked = selectSmallestTable(tables, new Set(), 12);
    expect(picked).toBeNull();
  });

  it('returns null when every compatible table is occupied', () => {
    const occupied = new Set(['T03', 'T04', 'T05', 'P01']);
    expect(selectSmallestTable(tables, occupied, 8)).toBeNull();
    expect(selectSmallestTable(tables, occupied, 6)).toBeNull();
  });

  it('breaks ties by sort order', () => {
    const tied = [
      { id: 'A', capacity: 4, sortOrder: 99 },
      { id: 'B', capacity: 4, sortOrder: 1 },
    ];
    expect(selectSmallestTable(tied, new Set(), 4)?.id).toBe('B');
  });
});

describe('availability classification', () => {
  it('classifies by free compatible resource count', () => {
    expect(classifyAvailability(0)).toBe('full');
    expect(classifyAvailability(1)).toBe('limited');
    expect(classifyAvailability(2)).toBe('available');
    expect(classifyAvailability(5)).toBe('available');
  });

  it('counts only tables that can seat the party', () => {
    expect(countFreeTables(tables, new Set(), 6)).toBe(2); // T05, P01
    expect(countFreeTables(tables, new Set(['T05']), 6)).toBe(1);
    expect(countFreeTables(tables, new Set(['T05', 'P01']), 6)).toBe(0);
  });
});

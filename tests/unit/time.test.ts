import { describe, expect, it } from 'vitest';
import {
  daysFromTodayLocal,
  getRestaurantToday,
  isValidLocalDate,
  localDayBounds,
  localDateTimeToUtc,
  localToUtc,
  utcToLocalDate,
  utcToLocalTime,
} from '@/lib/time';

describe('timezone-safe time helpers (Asia/Ho_Chi_Minh, UTC+7)', () => {
  it('converts local wall-clock time to the correct UTC instant', () => {
    // 2026-08-10 12:00 +07:00 == 2026-08-10 05:00Z
    const utc = localToUtc('2026-08-10', '12:00');
    expect(utc.toISOString()).toBe('2026-08-10T05:00:00.000Z');
  });

  it('converts back to local wall-clock time', () => {
    const utc = new Date('2026-08-10T05:00:00.000Z');
    expect(utcToLocalTime(utc)).toBe('12:00');
    expect(utcToLocalDate(utc)).toBe('2026-08-10');
  });

  it('handles the late-evening boundary across midnight UTC', () => {
    // 23:30 +07:00 == 16:30Z on the same day
    const utc = localToUtc('2026-08-10', '23:30');
    expect(utc.toISOString()).toBe('2026-08-10T16:30:00.000Z');
    expect(utcToLocalTime(utc)).toBe('23:30');
    expect(utcToLocalDate(utc)).toBe('2026-08-10');
  });

  it('computes day bounds in restaurant-local terms', () => {
    const { start, end } = localDayBounds('2026-08-10');
    expect(start.toISOString()).toBe('2026-08-09T17:00:00.000Z'); // 00:00 +07
    expect(end.toISOString()).toBe('2026-08-10T17:00:00.000Z'); // next day 00:00 +07, exclusive
  });

  it('converts datetime-local wall-clock input without using the browser timezone', () => {
    expect(localDateTimeToUtc('2026-08-10T18:30').toISOString()).toBe(
      '2026-08-10T11:30:00.000Z',
    );
  });

  it('getRestaurantToday returns YYYY-MM-DD in the restaurant zone', () => {
    const today = getRestaurantToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('daysFromTodayLocal is stable across the UTC day boundary', () => {
    const today = getRestaurantToday();
    expect(daysFromTodayLocal(today)).toBe(0);
    expect(daysFromTodayLocal(today)).toBeGreaterThanOrEqual(-1);
  });

  it('validates local date strings strictly', () => {
    expect(isValidLocalDate('2026-08-10')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('10-08-2026')).toBe(false);
    expect(isValidLocalDate('garbage')).toBe(false);
  });
});

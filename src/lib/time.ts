/**
 * Timezone-safe date/time helpers.
 *
 * The restaurant operates in Asia/Ho_Chi_Minh (UTC+7, no DST), but all
 * helpers go through Intl so they stay correct for any configured zone.
 * Database timestamps are always stored as UTC (timestamptz).
 */

import { RESTAURANT_TIMEZONE } from '@/config/restaurant';
export function zonedParts(
  date: Date,
  timeZone: string = RESTAURANT_TIMEZONE,
): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = weekdayMap[parts.find((p) => p.type === 'weekday')?.value ?? ''] ?? 1;

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    weekday,
  };
}

/** Local calendar date (YYYY-MM-DD) in the restaurant timezone. */
export function zonedDateISO(date: Date = new Date(), timeZone: string = RESTAURANT_TIMEZONE): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Restaurant-local "today" as YYYY-MM-DD — never derived from client UTC. */
export function getRestaurantToday(): string {
  return zonedDateISO(new Date());
}

/** Convert a local wall-clock time (YYYY-MM-DD + HH:MM) to a UTC Date. */
export function localToUtc(
  dateStr: string,
  time: string,
  timeZone: string = RESTAURANT_TIMEZONE,
): Date {
  // Treat the wall-clock string as UTC first, then shift by the zone offset
  // observed at that instant (handles fixed-offset zones like Asia/Ho_Chi_Minh).
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const guess = new Date(asUtc);
  const offsetMinutes = tzOffsetMinutesAt(guess, timeZone);
  return new Date(asUtc - offsetMinutes * 60_000);
}

/** Convert a `datetime-local` value interpreted as restaurant-local time. */
export function localDateTimeToUtc(
  value: string,
  timeZone: string = RESTAURANT_TIMEZONE,
): Date {
  const match = /^(\d{4}-\d{2}-\d{2})T(([01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match || !isValidLocalDate(match[1])) {
    throw new RangeError('Invalid restaurant-local date and time.');
  }
  return localToUtc(match[1], match[2], timeZone);
}

/** UTC Date → local wall-clock "HH:MM" in the restaurant timezone. */
export function utcToLocalTime(date: Date, timeZone: string = RESTAURANT_TIMEZONE): string {
  const { hour, minute } = zonedParts(date, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** UTC Date → local date string YYYY-MM-DD in the restaurant timezone. */
export function utcToLocalDate(date: Date, timeZone: string = RESTAURANT_TIMEZONE): string {
  return zonedDateISO(date, timeZone);
}

/** Local date YYYY-MM-DD → UTC [startOfDay, startOfNextDay) bounds. */
export function localDayBounds(
  dateStr: string,
  timeZone: string = RESTAURANT_TIMEZONE,
): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
  return {
    start: localToUtc(dateStr, '00:00', timeZone),
    end: localToUtc(nextDateStr, '00:00', timeZone),
  };
}

/** Offset in minutes of the zone at a given instant (UTC+7 → 420). */
function tzOffsetMinutesAt(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  });
  const parts = dtf.formatToParts(instant);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+07:00';
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

export function isValidLocalDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Days between today (restaurant-local) and a local date string. */
export function daysFromTodayLocal(dateStr: string, now: Date = new Date()): number {
  const today = localToUtc(zonedDateISO(now), '00:00');
  const target = localToUtc(dateStr, '00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

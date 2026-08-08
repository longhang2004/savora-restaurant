/**
 * Service-slot generation for the availability engine.
 *
 * Pure function: derives candidate slots from restaurant configuration
 * (service periods, slot interval, reservation duration) instead of
 * hardcoded arrays. A slot is only generated when the reservation can
 * finish before the service period ends.
 */
import { restaurantConfig } from '@/config/restaurant';
import { localToUtc } from '@/lib/time';

export interface ServiceSlot {
  /** Local wall-clock start time, "HH:MM" (Asia/Ho_Chi_Minh). */
  time: string;
  periodId: string;
  periodLabel: string;
  startsAt: Date;
  endsAt: Date;
}

export function generateSlotsForDate(
  dateStr: string,
  now: Date = new Date(),
): ServiceSlot[] {
  const { slotIntervalMinutes, durationMinutes } = restaurantConfig.reservation;
  const slots: ServiceSlot[] = [];

  for (const period of restaurantConfig.servicePeriods) {
    const periodEnd = localToUtc(dateStr, period.end);
    let minutes = 0;

    while (true) {
      const time = addMinutes(period.start, minutes);
      const startsAt = localToUtc(dateStr, time);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

      // Reservation must finish before the service period ends.
      if (endsAt.getTime() > periodEnd.getTime()) break;

      // Skip slots already in the past.
      if (startsAt.getTime() > now.getTime()) {
        slots.push({ time, periodId: period.id, periodLabel: period.label, startsAt, endsAt });
      }

      minutes += slotIntervalMinutes;
    }
  }

  return slots;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function isGeneratedSlot(slots: ServiceSlot[], time: string): boolean {
  return slots.some((slot) => slot.time === time);
}

import { describe, expect, it } from 'vitest';
import { generateSlotsForDate } from '@/features/reservations/slots';
import { localToUtc } from '@/lib/time';

describe('service-slot generation', () => {
  const now = new Date('2026-08-10T00:00:00Z'); // well before any slot

  it('generates 30-minute slots across lunch and dinner periods', () => {
    const slots = generateSlotsForDate('2026-08-10', now);
    const times = slots.map((s) => s.time);

    // Lunch 11:30–14:30 with 120-min duration → last start 12:30
    expect(times).toContain('11:30');
    expect(times).toContain('12:00');
    expect(times).toContain('12:30');
    expect(times).not.toContain('13:00'); // would end at 15:00 > 14:30

    // Dinner 17:30–22:00 → last start 20:00
    expect(times).toContain('17:30');
    expect(times).toContain('20:00');
    expect(times).not.toContain('20:30'); // would end at 22:30 > 22:00
  });

  it('never generates a slot whose end exceeds the service period end', () => {
    const slots = generateSlotsForDate('2026-08-10', now);
    for (const slot of slots) {
      if (slot.periodId === 'lunch') {
        expect(slot.endsAt.getTime()).toBeLessThanOrEqual(
          localToUtc('2026-08-10', '14:30').getTime(),
        );
      }
      if (slot.periodId === 'dinner') {
        expect(slot.endsAt.getTime()).toBeLessThanOrEqual(
          localToUtc('2026-08-10', '22:00').getTime(),
        );
      }
    }
  });

  it('skips slots that already started', () => {
    const now = localToUtc('2026-08-10', '12:15'); // lunch in progress
    const slots = generateSlotsForDate('2026-08-10', now);
    const times = slots.map((s) => s.time);
    expect(times).not.toContain('11:30');
    expect(times).not.toContain('12:00');
    expect(times).toContain('12:30');
  });

  it('returns no slots when the day is over', () => {
    const now = localToUtc('2026-08-10', '23:00');
    const slots = generateSlotsForDate('2026-08-10', now);
    expect(slots).toHaveLength(0);
  });
});

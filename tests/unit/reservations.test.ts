import { describe, expect, it } from 'vitest';
import { createReservationSchema } from '@/features/reservations/validation';

describe('reservation input validation', () => {
  it('rejects impossible calendar dates even when they match the input shape', () => {
    const result = createReservationSchema.safeParse({
      date: '2026-02-30',
      time: '18:30',
      partySize: 2,
      name: 'Test Guest',
      email: 'guest@example.com',
      phone: '+84900000000',
      notes: '',
      source: 'online',
    });

    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { ErrorCodes } from '@/lib/errors';
import { validateScheduledOrderTime } from '@/features/checkout/scheduling';

const NOW = new Date('2026-08-08T05:00:00.000Z'); // 12:00 in Asia/Ho_Chi_Minh

describe('scheduled order business rules', () => {
  it('accepts a future time inside a configured service period', () => {
    const scheduled = validateScheduledOrderTime('2026-08-09T18:30', NOW);

    expect(scheduled.toISOString()).toBe('2026-08-09T11:30:00.000Z');
  });

  it('rejects a time while the restaurant is closed', () => {
    expect(() => validateScheduledOrderTime('2026-08-09T03:00', NOW)).toThrowError(
      expect.objectContaining({ code: ErrorCodes.VALIDATION_FAILED }),
    );
  });

  it('rejects the closing boundary and later times', () => {
    expect(() => validateScheduledOrderTime('2026-08-09T22:00', NOW)).toThrowError(
      expect.objectContaining({ code: ErrorCodes.VALIDATION_FAILED }),
    );
  });

  it('rejects a past restaurant-local time', () => {
    expect(() => validateScheduledOrderTime('2026-08-08T11:00', NOW)).toThrowError(
      expect.objectContaining({ code: ErrorCodes.VALIDATION_FAILED }),
    );
  });

  it('rejects a time beyond the scheduling horizon', () => {
    expect(() => validateScheduledOrderTime('2099-01-05T18:30', NOW)).toThrowError(
      expect.objectContaining({ code: ErrorCodes.VALIDATION_FAILED }),
    );
  });
});

import { describe, expect, it } from 'vitest';
import { percentOfCents } from '@/lib/money';

describe('money helpers', () => {
  it('computes percentages in integer cents without float drift', () => {
    expect(percentOfCents(9400, 500)).toBe(470);
    expect(percentOfCents(4700, 500)).toBe(235);
    expect(percentOfCents(1, 500)).toBe(0); // 0.05 → 0
    expect(percentOfCents(1234, 500)).toBe(62); // 61.7 → 62 (round half up)
    expect(percentOfCents(1000, 250)).toBe(25);
  });
});

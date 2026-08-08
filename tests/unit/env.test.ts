import { describe, expect, it } from 'vitest';
import { demoModeEnabled } from '@/config/env';

describe('demo mode environment guard', () => {
  it('never enables demo behavior in production', () => {
    expect(demoModeEnabled(true, 'production')).toBe(false);
    expect(demoModeEnabled(true, 'development')).toBe(true);
    expect(demoModeEnabled(false, 'production')).toBe(false);
  });

  it('allows the explicit local E2E context only against loopback PostgreSQL', () => {
    expect(
      demoModeEnabled(
        true,
        'production',
        true,
        'postgresql://savora:savora@127.0.0.1:54329/savora',
      ),
    ).toBe(true);
    expect(
      demoModeEnabled(
        true,
        'production',
        true,
        'postgresql://savora:secret@db.example.com:5432/savora',
      ),
    ).toBe(false);
  });
});

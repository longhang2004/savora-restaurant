import { describe, expect, it } from 'vitest';
import { createOrderAccessToken, verifyOrderAccessToken } from '@/features/checkout/access';

const SECRET = 'order-access-test-secret-that-is-long-enough';
const ORDER_ID = '00000000-0000-0000-0000-000000000001';
const PUBLIC_CODE = 'SV-ACCESS-001';

describe('customer order access tokens', () => {
  it('accepts the token derived for the same order reference', () => {
    const token = createOrderAccessToken(ORDER_ID, PUBLIC_CODE, SECRET);

    expect(verifyOrderAccessToken(ORDER_ID, PUBLIC_CODE, token, SECRET)).toBe(true);
  });

  it('rejects a missing or invalid token', () => {
    const token = createOrderAccessToken(ORDER_ID, PUBLIC_CODE, SECRET);

    expect(verifyOrderAccessToken(ORDER_ID, PUBLIC_CODE, undefined, SECRET)).toBe(false);
    expect(verifyOrderAccessToken(ORDER_ID, PUBLIC_CODE, `${token}tampered`, SECRET)).toBe(false);
  });

  it("rejects a different order's token", () => {
    const token = createOrderAccessToken(ORDER_ID, PUBLIC_CODE, SECRET);

    expect(
      verifyOrderAccessToken(
        '00000000-0000-0000-0000-000000000002',
        'SV-ACCESS-002',
        token,
        SECRET,
      ),
    ).toBe(false);
  });
});

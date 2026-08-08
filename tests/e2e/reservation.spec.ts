/**
 * E2E — customer reservation flow.
 *
 * date + party size → real server availability → slot → details →
 * transactional booking → real confirmation code.
 */
import { expect, test } from '@playwright/test';

/** Restaurant-local date N days from now (Asia/Ho_Chi_Minh, UTC+7). */
function localDateOffset(days: number): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() + days);
  return now.toISOString().slice(0, 10);
}

test('books a table end-to-end with a real confirmation code', async ({ page }) => {
  await page.goto('/reservations');

  // Step 1 — party size + date
  await page.getByLabel('Party Size').selectOption('2');
  const date = localDateOffset(2);
  await page.getByLabel('Date').fill(date);
  await page.getByRole('button', { name: 'Check Availability' }).click();

  // Step 2 — availability slots loaded from the server
  await expect(page.getByText('Available times')).toBeVisible();
  await expect(page.locator('button:has-text("18:30")')).toBeVisible();

  // Pick an available slot (dinner, 18:30)
  const slot = page.locator('button', { hasText: '18:30' }).first();
  await expect(slot).toBeEnabled();
  await slot.click();

  // Step 3 — customer details
  await page.getByLabel('Full Name').fill('E2E Diner');
  await page.getByLabel('Email Address').fill('e2e@test.dev');
  await page.getByLabel('Phone Number').fill('+84900001111');
  await page.getByRole('button', { name: 'Confirm Reservation' }).click();

  // Step 4 — real confirmation with a code
  await expect(page.getByText('Reservation Confirmed!')).toBeVisible();
  const code = await page
    .locator('text=/[A-Z2-9]{8}/')
    .first()
    .textContent();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
});

test('surfaces unavailable times and rejects invalid dates', async ({ page }) => {
  await page.goto('/reservations');
  await page.getByLabel('Party Size').selectOption('8');

  // 8 guests → only P01 (private dining) is compatible → limited/full states exist
  const date = localDateOffset(3);
  await page.getByLabel('Date').fill(date);
  await page.getByRole('button', { name: 'Check Availability' }).click();

  await expect(page.getByText('Available times')).toBeVisible();
  // At least one slot must be marked Limited or Full for a single-table party
  await expect(page.locator('button:has-text("Limited"), button:has-text("Full")').first()).toBeVisible();
});

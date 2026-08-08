/**
 * E2E — admin operations (demo sign-in).
 *
 * authenticated reservation workflow (seat → complete), order board
 * rendering, and the sold-out toggle propagating to the public menu.
 */
import { expect, test } from '@playwright/test';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('admin@savora.vn');
  await page.getByLabel('Password').fill('savora-demo');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Dashboard').first()).toBeVisible();
}

test('admin reservation workflow: seat and complete a guest', async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto('/admin/reservations');
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();

  // Today's seeded CONFIRMED reservation (Trang Do, 18:30)
  const row = page.locator('tr', { hasText: 'Trang Do' }).first();
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Seat' }).click();
  await expect(row.locator('text=SEATED')).toBeVisible();

  await row.getByRole('button', { name: 'Complete' }).click();
  await expect(row.locator('text=COMPLETED')).toBeVisible();
});

test('sold-out lifecycle: seeded sold-out state, admin toggle, public propagation', async ({ page }) => {
  // 1. Seeded state: Lotus Tea is sold out on the public menu.
  await page.goto('/menu');
  await expect(page.locator('text=Sold Out').first()).toBeVisible();
  await expect(page.getByText('Currently unavailable').first()).toBeVisible();

  // 2. Admin toggles it back to Available.
  await signInAsAdmin(page);
  await page.goto('/admin/menu');
  const lotusRow = page.locator('tr', { hasText: 'Lotus Tea' }).first();
  await expect(lotusRow).toBeVisible();
  await lotusRow.getByRole('button', { name: /Sold out/ }).click();
  await expect(lotusRow.locator('text=Available')).toBeVisible();

  // 3. Public menu reflects the change (server-rendered from the DB).
  await page.goto('/menu');
  await expect(page.getByText('Currently unavailable').first()).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: /Add Lotus Tea/ }).first(),
  ).toBeVisible();
});

test('order board renders paid orders with fulfillment details', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin/orders');

  await expect(page.getByText('Order Board')).toBeVisible();
  // Seeded paid order is in the kitchen flow
  await expect(page.locator('tr', { hasText: 'SV-ORD-2401' }).first()).toBeVisible();
  await expect(page.locator('text=PAID').first()).toBeVisible();
});

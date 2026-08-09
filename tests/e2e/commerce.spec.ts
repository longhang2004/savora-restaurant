/**
 * E2E — customer commerce flow (demo-mode payment).
 *
 * menu → configure modifiers → cart → guest checkout → sandbox payment
 * (simulates the PayOS webhook) → real order confirmation page.
 */
import { expect, test } from '@playwright/test';

test('orders a configured dish through checkout and confirms payment', async ({ page }) => {
  // Menu is database-backed: the seeded Wagyu Phở must be orderable.
  await page.goto('/menu');
  const phoCard = page.locator('article, div', { hasText: 'A5 Wagyu Beef Phở' }).filter({
    has: page.locator('text=Customize & Add'),
  });
  await expect(phoCard.first()).toBeVisible();

  // Configure modifiers (aria-label on the card button overrides visible text)
  await page.getByRole('button', { name: /Add A5 Wagyu Beef Phở/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByText('Large').click();
  await page.getByText('Extra Wagyu').click();
  await page.getByRole('button', { name: /Add ·/ }).click();

  // Cart badge + cart page
  await expect(page.getByLabel(/Cart, 1 items/)).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByText('A5 Wagyu Beef Phở')).toBeVisible();
  await expect(page.getByText('Large')).toBeVisible();
  await expect(page.getByText('Extra Wagyu')).toBeVisible();

  // Guest checkout
  await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();
  await page.getByText('Full Name').locator('..').locator('input').fill('E2E Shopper');
  await page.getByText('Email').locator('..').locator('input').fill('shopper@test.dev');
  await page.getByText('Phone').locator('..').locator('input').fill('+84900002222');
  await page.getByRole('button', { name: 'Continue to Payment' }).click();

  // Demo mode (no PayOS credentials) → sandbox payment page
  await expect(page).toHaveURL(/\/checkout\/sandbox\?order=SV-/);
  const sandboxUrl = page.url();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('savora-cart-v1'))).not.toBeNull();
  await expect(
    page.getByRole('heading', { name: 'Sandbox Payment' }),
  ).toBeVisible();

  // A valid but unpaid confirmation must leave the cart intact.
  await page.goto(sandboxUrl.replace('/checkout/sandbox', '/checkout/success'));
  await expect(page.getByText(/awaiting payment/i)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('savora-cart-v1'))).not.toBeNull();

  await page.goto(sandboxUrl);

  // Simulated webhook → real state change
  await page.getByRole('button', { name: /Simulate payment confirmation/ }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=SV-/);
  await expect(page.getByText(/payment received/i)).toBeVisible();
  await expect(page.getByText(/SV-/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('savora-cart-v1'))).toBeNull();
});

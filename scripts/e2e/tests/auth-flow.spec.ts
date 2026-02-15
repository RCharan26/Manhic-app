import { test, expect } from '@playwright/test';

// These tests use a dev-only test mode. Start the app with Vite env:
// VITE_TEST_MODE=true npm run dev
// The tests set localStorage keys to simulate a signed-in user/profile.

test.describe('Auth role flow (UI-only, dev test mode)', () => {
  test('Selecting customer role redirects to customer dashboard', async ({ page }) => {
    await page.goto('http://localhost:8082/', { waitUntil: 'domcontentloaded' });

    // Inject test profile role before navigation to ensure RoleGate reads it
    await page.evaluate(() => {
      localStorage.setItem('TEST_PROFILE_ROLE', 'customer');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/customer-dashboard/);
  });

  test('Selecting mechanic role redirects to mechanic dashboard', async ({ page }) => {
    await page.goto('http://localhost:8082/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      localStorage.setItem('TEST_PROFILE_ROLE', 'mechanic');
    });

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/mechanic-dashboard/);
  });
});

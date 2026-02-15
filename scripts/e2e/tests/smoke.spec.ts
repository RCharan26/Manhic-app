import { test, expect } from '@playwright/test';

// Basic smoke test — requires Playwright and dev server running at localhost:8082

test('app index serves', async ({ page }) => {
  await page.goto('http://localhost:8082/');
  await expect(page).toHaveTitle(/Manhic/);
});

test('service request page', async ({ page }) => {
  await page.goto('http://localhost:8082/service-request');
  await expect(page.locator('text=Request Assistance')).toBeVisible({ timeout: 5000 });
});

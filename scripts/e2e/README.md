Playwright smoke-test scaffold

This folder contains a scaffold for an automated smoke test using Playwright.

Setup (recommended):

1. Install Playwright (Node):

   npm i -D @playwright/test
   npx playwright install --with-deps

2. Add a script to package.json:

   "scripts": {
     "test:e2e": "playwright test --project=chromium"
   }

3. Create `tests/smoke.spec.ts` (example below) and run:

   npm run test:e2e

Example test (skeleton):

```ts
import { test, expect } from '@playwright/test';

test('customer flow smoke', async ({ page }) => {
  await page.goto('http://localhost:8082/');
  // adjust selectors to match app
  await expect(page).toHaveTitle(/Manhic/);
  // navigate to request page
  await page.goto('http://localhost:8082/service-request');
  await expect(page.locator('text=Request Assistance')).toBeVisible();
});
```

Notes:
- The app depends on Clerk auth; for API tests you may prefer to call edge functions directly with a test token instead of automating the UI sign-in.
- To run full end-to-end with DB assertions, provide Supabase service role key to a separate helper or run integration tests against a test project.

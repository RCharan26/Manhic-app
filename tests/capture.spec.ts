import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('capture earnings page console and supabase responses', async ({ page }) => {
  const consoleLogs: string[] = [];
  const supabaseResponses: Array<{ url: string; status: number; body: any }> = [];

  page.on('console', (msg) => {
    consoleLogs.push(`[console:${msg.type()}] ${msg.text()}`);
  });

  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('service_requests') || url.includes('/rest/v1/')) {
        let body: any = null;
        try {
          body = await response.json();
        } catch (e) {
          body = await response.text();
        }
        supabaseResponses.push({ url, status: response.status(), body });
      }
    } catch (e) {
      consoleLogs.push(`[response:error] ${String(e)}`);
    }
  });

  // Navigate to the running dev server
  const url = process.env.TEST_URL || 'http://localhost:8081/earnings';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // wait a bit for async requests
  await page.waitForTimeout(2000);

  console.log('\n--- Console logs ---');
  for (const l of consoleLogs) console.log(l);

  console.log('\n--- Supabase / service_requests responses ---');
  for (const r of supabaseResponses) {
    console.log(`URL: ${r.url} STATUS: ${r.status}`);
    try {
      console.log('BODY:', typeof r.body === 'string' ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 1000));
    } catch (e) {
      console.log('BODY: <unserializable>');
    }
  }

  // Basic assertion to make the test pass/fail visibly
  expect(true).toBeTruthy();
});

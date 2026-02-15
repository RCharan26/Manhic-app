const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const supabaseResponses = [];

  page.on('console', (msg) => {
    consoleLogs.push(`[console:${msg.type()}] ${msg.text()}`);
  });

  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('service_requests') || url.includes('/rest/v1/')) {
        let body = null;
        try {
          body = await response.json();
        } catch (e) {
          try { body = await response.text(); } catch (e2) { body = '<no-body>' }
        }
        supabaseResponses.push({ url, status: response.status(), body });
      }
    } catch (e) {
      consoleLogs.push(`[response:error] ${String(e)}`);
    }
  });

  const url = process.env.TEST_URL || 'http://localhost:8081/earnings';
  console.log('Opening', url);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.error('Navigation error:', e.message || e);
  }

  await page.waitForTimeout(2000);

  console.log('\n--- Console logs ---');
  for (const l of consoleLogs) console.log(l);

  console.log('\n--- Supabase / service_requests responses ---');
  for (const r of supabaseResponses) {
    console.log(`URL: ${r.url} STATUS: ${r.status}`);
    try {
      console.log('BODY:', typeof r.body === 'string' ? r.body.slice(0, 1000) : JSON.stringify(r.body).slice(0, 2000));
    } catch (e) {
      console.log('BODY: <unserializable>');
    }
  }

  await browser.close();
  process.exit(0);
})();

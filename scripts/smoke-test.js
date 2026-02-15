const fetch = globalThis.fetch || require('node-fetch');
const urls = [
  '/',
  '/service-request',
  '/customer-dashboard',
  '/mechanic-dashboard',
  '/request-tracking',
];
const base = 'http://localhost:8082';
(async () => {
  for (const u of urls) {
    const url = base + u;
    try {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      console.log(`=== ${url} -> ${res.status}`);
      const snippet = text.slice(0, 800).replace(/\n/g, ' ');
      console.log(snippet);
      console.log('--- contains markers:');
      console.log(' Request Assistance:', /Request Assistance/.test(text));
      console.log(' Customer Dashboard:', /Customer Dashboard/.test(text) || /customer-dashboard/.test(text));
      console.log(' Mechanic Dashboard:', /Mechanic Dashboard/.test(text) || /mechanic-dashboard/.test(text));
      console.log(' index root:', /<div id="root"/.test(text));
      console.log('\n');
    } catch (e) {
      console.error(`ERR ${url}:`, e.message);
    }
  }
})();

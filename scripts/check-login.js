const fetch = require('node-fetch');
const ports = [8080,8081,8082,8083,8084,8085];
(async () => {
  for (const p of ports) {
    const url = `http://localhost:${p}/login`;
    try {
      const res = await fetch(url, { method: 'GET', timeout: 3000 });
      const text = await res.text();
      console.log(`=== ${url} -> ${res.status}`);
      console.log(text.slice(0, 600).replace(/\n/g, ' '));
      return;
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
  console.log('No server responded on ports', ports.join(', '));
})();

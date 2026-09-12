const http = require('http');

const API = { host: 'localhost', port: process.env.PORT || 3001, path: '/api/products' };

function getProducts() {
  return new Promise((resolve, reject) => {
    const opts = { hostname: API.host, port: API.port, path: API.path, method: 'GET' };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function postProducts(products) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(products);
    const opts = {
      hostname: API.host,
      port: API.port,
      path: API.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve(parsed);
        } catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    console.log('Fetching current products...');
    const before = await getProducts();
    console.log('Products before:', before.length);
    if (!Array.isArray(before) || before.length === 0) {
      console.error('No products to remove. Exiting.');
      process.exit(1);
    }

    // Choose a product to remove (last one)
    const removed = before[before.length - 1];
    console.log('Removing product:', removed.id || removed.name || '(unknown)');

    const updated = before.slice(0, before.length - 1);

    console.log('Posting updated products (count:', updated.length, ')...');
    const postResp = await postProducts(updated);
    console.log('POST response:', postResp && postResp.message ? postResp.message : JSON.stringify(postResp));

    console.log('Fetching products after POST...');
    const after = await getProducts();
    console.log('Products after:', after.length);

    const exists = after.find(p => p.id === removed.id);
    if (!exists && after.length === updated.length) {
      console.log('SUCCESS: Product deletion persisted to server.');
      process.exit(0);
    } else {
      console.error('FAIL: Product still exists or counts mismatch.');
      process.exit(2);
    }
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(3);
  }
})();

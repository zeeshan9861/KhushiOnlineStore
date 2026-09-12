const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json({ limit: '10mb' }));

// Simple CORS for local testing
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_PRODUCTS_TABLE = process.env.SUPABASE_PRODUCTS_TABLE || 'products';

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRequest(pathname, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function readProductsFromSupabase() {
  const table = encodeURIComponent(SUPABASE_PRODUCTS_TABLE);
  const response = await supabaseRequest(`${table}?select=product&order=id.asc`);
  if (!response.ok) {
    throw new Error(`Supabase GET failed with ${response.status}`);
  }

  const rows = await response.json();
  return rows.map(row => row.product).filter(Boolean);
}

async function saveProductsToSupabase(products) {
  const table = encodeURIComponent(SUPABASE_PRODUCTS_TABLE);
  const rows = products.map(product => ({ id: product.id, product }));

  const deleteResponse = await supabaseRequest(`${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' }
  });
  if (!deleteResponse.ok) {
    throw new Error(`Supabase DELETE failed with ${deleteResponse.status}`);
  }

  if (rows.length === 0) return;

  const insertResponse = await supabaseRequest(`${table}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!insertResponse.ok) {
    throw new Error(`Supabase POST failed with ${insertResponse.status}`);
  }
}

// GET products
app.get('/api/products', async (req, res) => {
  if (isSupabaseConfigured()) {
    try {
      return res.json(await readProductsFromSupabase());
    } catch (error) {
      console.error('Supabase read failed:', error.message);
      return res.status(502).json({ error: 'Could not read products from database' });
    }
  }

  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Could not read products file' });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: 'Invalid products.json format' });
    }
  });
});

// POST products (replace all products in the configured store)
app.post('/api/products', async (req, res) => {
  const products = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'Expected an array of products' });

  const productIds = products.map(product => product && product.id);
  if (productIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(productIds).size !== productIds.length) {
    return res.status(400).json({ error: 'Every product must have a unique string id' });
  }

  if (isSupabaseConfigured()) {
    try {
      await saveProductsToSupabase(products);
      return res.json({ success: true, message: 'Products saved to Supabase' });
    } catch (error) {
      console.error('Supabase write failed:', error.message);
      return res.status(502).json({ error: 'Could not save products to database' });
    }
  }

  // Backup existing file
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const backupPath = PRODUCTS_FILE + '.bak';
      fs.copyFileSync(PRODUCTS_FILE, backupPath);
    }
  } catch (e) { /* ignore backup errors */ }

  fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Could not write products file' });
    res.json({ success: true, message: 'Products saved' });
  });
});

// Serve static site (frontend) so you can open http://localhost:3000
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for single-page navigation (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Products API server listening on http://localhost:${PORT}`);
  console.log(`GET  /api/products  -> ${isSupabaseConfigured() ? 'read Supabase' : 'read products.json'}`);
  console.log(`POST /api/products  -> ${isSupabaseConfigured() ? 'save Supabase' : 'overwrite products.json'}`);
});

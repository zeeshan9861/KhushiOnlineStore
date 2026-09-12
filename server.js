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

// GET products
app.get('/api/products', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Could not read products file' });
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (e) {
      res.status(500).json({ error: 'Invalid products.json format' });
    }
  });
});

// POST products (overwrite products.json)
app.post('/api/products', (req, res) => {
  const products = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'Expected an array of products' });

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
  console.log(`GET  /api/products  -> read products.json`);
  console.log(`POST /api/products  -> overwrite products.json`);
});

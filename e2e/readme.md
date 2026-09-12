End-to-end test (WhatsApp) for Khushi Online Store

Prerequisites
- Node.js (14+)
- The site served locally (examples below)

Install

```bash
cd "e:\Khushi Online Store - V24TH JAN 2026"
npm init -y
npm install puppeteer --save-dev
```

Run a local static server (one of these):

```bash
# Python 3
python -m http.server 5500

# Or using http-server (npm)
npx http-server -p 5500
```

Run the test

```bash
# From the repository root
node e2e/test-whatsapp.js
```

Notes
- The test pre-populates `localStorage` with two cart items and fills the customer form.
- If you host on a different port or path, set `BASE_URL` env var, e.g. `BASE_URL=http://localhost:8080/index.html node e2e/test-whatsapp.js`.
- The script prints the message preview and basic PASS/FAIL checks for header, customer details, and Grand Total.
- I cannot run Puppeteer from this environment; run the commands above locally and share output if you want me to help interpret failures.
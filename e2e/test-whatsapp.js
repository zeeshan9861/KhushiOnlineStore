const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Pre-populate cart in localStorage before page scripts run
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('khushi_cart_v1', JSON.stringify([
      { id: '1', name: 'Persona Kisan', price: 880, imageUrl: '', quantity: 4 },
      { id: '2', name: 'Persona Agni', price: 1180, imageUrl: '', quantity: 1 }
    ]));
  });

  // Adjust the URL if you serve the site on a different port
  const baseUrl = process.env.BASE_URL || 'http://localhost:5500/index.html';
  console.log('Opening', baseUrl);

  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  // Open cart modal
  await page.click('#view-cart-btn');
  await page.waitForSelector('#cust-name', { visible: true, timeout: 3000 });

  // Fill customer details
  await page.type('#cust-name', 'Muhammad Zeeshan');
  await page.type('#cust-whatsapp', '+917004692562');
  await page.type('#cust-address', 'T');

  // Click WhatsApp button and capture popup + preview
  const [popup] = await Promise.all([
    page.waitForEvent('popup').catch(() => null),
    page.click('#whatsapp-share-btn')
  ]);

  // Wait for preview to appear
  await page.waitForSelector('#message-preview', { visible: true, timeout: 3000 });
  const preview = await page.$eval('#message-preview', el => el.textContent.trim());

  console.log('\n----- MESSAGE PREVIEW -----\n');
  console.log(preview);
  console.log('\n----- END PREVIEW -----\n');

  if (popup) {
    const popupUrl = popup.url();
    console.log('Popup opened with URL:', popupUrl);
  } else {
    console.log('No popup detected (popup may be blocked or not opened in this environment).');
  }

  // Basic assertions
  const okHeader = preview.includes('Khushi Online Stores Order Request');
  const okCustomer = preview.includes('Name: Muhammad Zeeshan') && preview.includes('+917004692562');
  const okTotal = preview.includes('Grand Total: ₹4,700') || preview.includes('Grand Total: ₹4700');

  console.log('Header OK:', okHeader);
  console.log('Customer OK:', okCustomer);
  console.log('Total OK:', okTotal);

  const allOk = okHeader && okCustomer && okTotal;
  console.log('\nE2E RESULT:', allOk ? 'PASS' : 'FAIL');

  await browser.close();
  process.exit(allOk ? 0 : 1);
})();

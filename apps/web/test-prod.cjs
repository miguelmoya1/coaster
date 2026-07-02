const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://localhost:4201/login');
  await page.waitForTimeout(3000);
  console.log('DOM CONTENT:', await page.content());
  await browser.close();
  process.exit(0);
})();

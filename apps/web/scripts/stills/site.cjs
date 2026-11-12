// Re-captures the homepage stills that show the demo restaurant's food.
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'stills-out';
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3401';
const STORE_CSS = `
  .mh-root > div:has(> a[href="/demo"]) { visibility: hidden !important; }
  .mh-root > header { top: 36px !important; }
  * { -webkit-tap-highlight-color: transparent !important; caret-color: transparent !important; }`;
const CRM_CSS = `
  .force-dark > div > div:first-child:has(a[href="/"]) { display: none !important; }
  #demo-sidebar > div:has(> a[href="/#features"]) { display: none !important; }
  * { caret-color: transparent !important; }`;

(async () => {
  const b = await chromium.launch();
  const page = async (w, h, path, css) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: css });
    await p.waitForTimeout(600);
    return p;
  };
  const settle = async (p) => {
    await p.evaluate(async () => {
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    await p.waitForTimeout(500);
  };

  // pv-website: the ordering site's home page
  let p = await page(1280, 836, '/demo/merchant', STORE_CSS);
  await settle(p);
  await p.screenshot({ path: `${OUT}/pv-website.png`, clip: { x: 0, y: 36, width: 1280, height: 800 } });
  // pv-ordering: its menu, with the photo cards
  await p.getByRole('button', { name: 'Menu', exact: true }).first().click();
  await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollTo(0, 0));
  await settle(p);
  await p.screenshot({ path: `${OUT}/pv-ordering.png`, clip: { x: 0, y: 36, width: 1280, height: 800 } });
  await p.close();

  // site-home-phone: the ordering site on a phone
  p = await page(390, 880, '/demo/merchant', STORE_CSS);
  await settle(p);
  await p.screenshot({ path: `${OUT}/site-home-phone.png`, clip: { x: 0, y: 36, width: 390, height: 844 } });
  await p.close();

  // pv-pos: the POS with an order rung up for Sofia
  p = await page(1440, 940, '/demo/live/pos', CRM_CSS);
  const item = (name) => p.locator('button', { hasText: name }).first();
  const tab = (name) => p.getByRole('button', { name, exact: true });
  await item('Margherita').click();
  await item('Margherita').click();
  await item('Pepperoni').click();
  await tab('Sides').click();
  await item('Garlic bread').click();
  await tab('Drinks').click();
  await item('Cola').click();
  await tab('Pizzas').click();
  await p.getByPlaceholder(/Customer name/).fill('Sofia De Luca');
  await p.getByPlaceholder(/Phone/).fill('0491 571 804');
  await p.locator(':focus').blur();
  await p.mouse.move(5, 5);
  await settle(p);
  await p.screenshot({ path: `${OUT}/pv-pos.png`, clip: { x: 232, y: 40, width: 1208, height: 755 } });
  await p.close();
  await b.close();
})();

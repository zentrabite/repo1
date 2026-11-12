// Re-captures the other CRM stills the site uses, with the new green.
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'stills-out';
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:3401';
const CRM_CSS = `
  .force-dark > div > div:first-child:has(a[href="/"]) { display: none !important; }
  #demo-sidebar > div:has(> a[href="/#features"]) { display: none !important; }
  * { caret-color: transparent !important; }`;
(async () => {
  const b = await chromium.launch();
  const crm = async (path, name, prep, h = 940) => {
    const p = await b.newPage({ viewport: { width: 1440, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: CRM_CSS });
    await p.waitForTimeout(500);
    if (prep) await prep(p);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(600);
    if (name) await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 232, y: 40, width: 1208, height: 755 } });
    return p;
  };
  for (const [path, name] of [['/demo/live/delivery', 'pv-delivery'], ['/demo/live/reviews', 'pv-reviews'], ['/demo/live/rewards', 'pv-rewards'], ['/demo/live/stock', 'pv-stock']]) {
    (await crm(path, name)).close();
  }
  let p = await crm('/demo/live/winback', 'pv-winback', async (p) => {
    await p.locator('button.wb-row').first().click();
    await p.waitForTimeout(400);
  });
  await p.close();
  const openSofia = async (p) => {
    await p.getByText('Sofia De Luca').first().click();
    await p.waitForTimeout(500);
  };
  p = await crm('/demo/live/customers', 'pv-customer-profile', openSofia);
  await p.close();
  p = await crm('/demo/live/customers', null, openSofia, 921);
  await p.locator('aside').last().screenshot({ path: `${OUT}/crm-customer-profile-panel.png` });
  await p.close();
  await b.close();
})();

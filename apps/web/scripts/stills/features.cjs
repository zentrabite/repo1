// Screens for the feature pages that don't have a clip or still yet.
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
  const crm = async (path, name, prep) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: CRM_CSS });
    await p.waitForTimeout(500);
    if (prep) await prep(p);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 232, y: 40, width: 1208, height: 755 } });
    await p.close();
  };
  await crm('/demo/live/fulfillment', 'fp-fulfillment');
  await crm('/demo/live/ai-calls', 'fp-ai-calls');
  await crm('/demo/live/automations', 'fp-automations');
  await crm('/demo/live/rostering', 'fp-rostering');
  await crm('/demo/live/financials', 'fp-financial-reporting');
  await crm('/demo/live/financials', 'fp-stripe-payouts', async (p) => {
    const el = p.getByText('Payouts deposited').first();
    const y = await el.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await p.evaluate((y) => window.scrollTo(0, Math.max(0, y - 420)), y);
  });

  // The customer app: just the phone screen
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await p.goto(BASE + '/demo/app', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const screen = p.locator('.app-screen').first();
  await screen.screenshot({ path: `${OUT}/fp-custom-mobile-app.png` });
  await p.close();
  await b.close();
})();

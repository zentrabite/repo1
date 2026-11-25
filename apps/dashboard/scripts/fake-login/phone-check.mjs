// Phone check for the CRM, a shop's website and its ordering page, on the
// fake login (see README.md). Opens every page at phone widths, taps through
// each page's tabs, and flags the page wider than the screen, content
// spilling out of its box, content cut off inside a card, and squashed text.
// The checks are the same as apps/web/scripts/checks/phone-check.py.
//
//   node scripts/fake-login/phone-check.mjs            # 320 and 390, every page
//   WIDTHS=360 ONLY=/orders,/pos node scripts/fake-login/phone-check.mjs
//   SHOTS=/tmp/shots node ...                          # a screenshot of each page with a problem
//   DIALOGS=1 node ...                                 # also tap each button and check any dialog it opens
//
// With DIALOGS=1 it skips buttons that log out, and the fake Supabase saves
// nothing, so tapping Save or Send is harmless.
//
// Needs the fake Supabase and a production build running on port 3000.
import { open } from "./login.mjs";
import { mkdirSync } from "node:fs";

const WIDTHS = (process.env.WIDTHS ?? "320,390").split(",").map(Number);
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SHOTS = process.env.SHOTS ?? null;
const DIALOGS = process.env.DIALOGS === "1";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const SHOP = "22222222-2222-4222-8222-222222222222";
const PAGES = [
  // The owner (also a super admin).
  ...["/dashboard", "/copilot", "/orders", "/fulfillment", "/pos", "/menu", "/stock", "/ai-calls", "/delivery", "/drivers",
    "/reviews", "/customers", "/rewards", "/zentra-rewards", "/zentra-rewards/report", "/automations", "/campaigns",
    "/analytics", "/financials", "/rostering", "/settings",
    "/admin", "/admin/sending", "/admin/setup", "/admin/sellers", "/admin/enquiries", "/admin/onboarding/new", `/admin/businesses/${SHOP}`,
  ].map(path => ({ path, as: "owner" })),
  // A team member, a seller, and pages with no login.
  { path: "/customers", as: "staff" },
  { path: "/sell", as: "seller" },
  { path: "/sell/new", as: "seller" },
  ...["/site/nonna", "/store/nonna", "/store/nonna?code=W4NTPRZZ", "/login", "/signup", "/forgot-password"].map(path => ({ path, as: "owner", public: true })),
];

const CHECK = `() => {
 const vw=innerWidth, probs=[];
 const sw=document.documentElement.scrollWidth; if(sw>vw+1) probs.push('PAGE WIDER THAN SCREEN sw='+sw);
 const vis=el=>{const r=el.getBoundingClientRect();return r.width>1&&r.height>1};
 const txt=el=>(el.innerText||el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40);
 const closedMenu=el=>{const d=el.closest('aside');return d&&d.getBoundingClientRect().right<=0};
 const all=[...document.body.querySelectorAll('*')].filter(el=>!(el instanceof SVGElement)&&!closedMenu(el));
 const spill=new Map();
 for(const el of all){const cs=getComputedStyle(el);
   if(cs.display==='inline'||cs.display==='contents'||cs.display==='none'||cs.overflowX!=='visible')continue;
   if(el.clientWidth<1||!vis(el)||el.scrollWidth<=el.clientWidth+1)continue;
   const r=el.getBoundingClientRect(); let far=0;
   for(const n of el.childNodes){
     if(n.nodeType===3&&n.textContent.trim()){const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())far=Math.max(far,q.right-r.right,r.left-q.left)}
     else if(n.nodeType===1){const ccs=getComputedStyle(n);if(ccs.position==='absolute'||ccs.position==='fixed'||ccs.display==='none')continue;const q=n.getBoundingClientRect();if(q.width<1)continue;far=Math.max(far,q.right-r.right,r.left-q.left)}}
   if(far>1)spill.set(el,Math.round(far))}
 for(const [el,far] of spill){ if([...spill.keys()].some(o=>o!==el&&el.contains(o)))continue;
   probs.push('SPILLS OUT OF ITS BOX by '+far+'px | '+el.tagName+'.'+(el.className||'').toString().split(' ')[0]+' "'+txt(el)+'" w='+el.clientWidth)}
 for(const el of all){ if(el.children.length>0&&el.tagName!=='BUTTON')continue; if(!vis(el))continue;
   const r=el.getBoundingClientRect(); let a=el.parentElement;
   while(a&&a!==document.body){const cs=getComputedStyle(a);const ox=cs.overflowX;
     if(ox==='auto'||ox==='scroll')break;
     if(ox==='hidden'||ox==='clip'){const ar=a.getBoundingClientRect(); if(ar.width>2&&(r.right>ar.right+2||r.left<ar.left-2)&&!el.closest('[aria-hidden="true"]')&&getComputedStyle(el).position!=='absolute') probs.push('CUT OFF | '+el.tagName+' "'+txt(el)+'"'); break}
     a=a.parentElement}}
 for(const el of all){ if(!vis(el))continue; const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
   if(own.length>=8){const r=el.getBoundingClientRect(); const fs=parseFloat(getComputedStyle(el).fontSize)||14;
     if(r.width<fs*3.2 && r.height>fs*2.6) probs.push('SQUASHED TEXT | '+el.tagName+' "'+own.slice(0,30)+'" w='+Math.round(r.width))}}
 return [...new Set(probs)].slice(0,12)}`;

const TABS = `() => [...document.querySelectorAll('[role=tab]')].filter(b=>{const r=b.getBoundingClientRect();return r.width>1&&r.height>1}).map(b=>(b.innerText||'').trim().slice(0,30))`;

// Buttons on the page itself, not the menu, with how many share each name.
const BUTTONS = `() => { const seen = {}; return [...document.querySelectorAll('main button, main [role=button]')]
  .filter(b => { const r = b.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !b.closest('[role=dialog]') && !b.disabled; })
  .map(b => { const t = (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 40); seen[t] = (seen[t] || 0) + 1; return [t, seen[t] - 1]; })
  .filter(([t]) => t && !/log ?out|sign ?out/i.test(t)).slice(0, 30); }`;

async function dialogStates(page, path) {
  const out = [];
  for (const [name, n] of await page.evaluate(`(${BUTTONS})()`)) {
    try {
      const btn = page.locator("main button, main [role=button]").filter({ hasText: name }).nth(n);
      await btn.click({ timeout: 1500 });
      await page.waitForTimeout(450);
      const dialog = page.locator("[role=dialog]").first();
      if (await dialog.isVisible().catch(() => false)) {
        out.push([` [dialog from "${name}"]`, await page.evaluate(`(${CHECK})()`)]);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(250);
      }
      if (!page.url().includes(path.split("?")[0])) await page.goto("http://localhost:3000" + path, { waitUntil: "load" }).then(() => page.waitForTimeout(1000));
    } catch { /* a button that moved or went away */ }
  }
  return out;
}

const slug = s => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
let problems = 0;
for (const w of WIDTHS) {
  for (const p of PAGES) {
    if (ONLY && !ONLY.includes(p.path)) continue;
    const { browser, page, errors } = await open(p.path, { width: w, height: 800 }, p.as);
    try {
      await page.waitForTimeout(1500);
      const states = [["", await page.evaluate(`(${CHECK})()`)]];
      for (const tab of await page.evaluate(`(${TABS})()`)) {
        if (!tab) continue;
        await page.getByRole("tab", { name: tab, exact: true }).first().click().catch(() => {});
        await page.waitForTimeout(500);
        states.push([` [tab ${tab}]`, await page.evaluate(`(${CHECK})()`)]);
      }
      if (DIALOGS && !p.public) {
        states.push(...(await dialogStates(page, p.path)));
        // The first row that opens something (an order, a customer), and the dialogs in it.
        const row = page.locator("main tr[tabindex='0']").first();
        if (await row.isVisible().catch(() => false)) {
          await page.goto("http://localhost:3000" + p.path, { waitUntil: "load" });
          await page.waitForTimeout(1200);
          await row.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(600);
          states.push([" [first row opened]", await page.evaluate(`(${CHECK})()`)]);
          states.push(...(await dialogStates(page, p.path)).map(([w, x]) => [" [first row]" + w, x]));
        }
      }
      const found = states.filter(([, probs]) => probs.length);
      // The fake Supabase has no live updates, so the Orders board's connection always fails.
      const bad = errors.filter(e => !/Failed to load resource|favicon|net::ERR|realtime\/v1\/websocket/.test(e));
      if (found.length || bad.length) {
        problems += found.length;
        console.log(`\n${w}px ${p.as} ${p.path}`);
        for (const [where, probs] of found) for (const x of probs) console.log(`  ${where} ${x}`);
        for (const e of bad.slice(0, 3)) console.log(`  console: ${e.slice(0, 160)}`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${w}-${p.as}-${slug(p.path)}.png`, fullPage: true });
      } else {
        console.log(`${w}px ${p.as} ${p.path} ok (${states.length} states)`);
      }
    } finally {
      await browser.close();
    }
  }
}
console.log(`\n${problems} page states with problems`);

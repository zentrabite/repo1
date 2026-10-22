// ─── Website import: pattern-based extraction ───────────────────────────────
// Port of the tested Python extractor (project doc claude/code/import-extract.py).
// Reads structured data first (JSON-LD, meta tags), then page text. The AI step
// in ./ai.ts does the parts patterns can't (about text, messy hours, menus).

import { parse, NodeType, type HTMLElement, type Node } from "node-html-parser";
import type { DayHours, DayKey, ImportedHours, ImportedMenuItem, Session } from "./types";
import { DAY_KEYS } from "./types";

// ─── Patterns ───────────────────────────────────────────────────────────────

const DAYS = String.raw`(?:mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)`;
const TIME = String.raw`(?:\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)|\d{1,2}[:.]\d{2}|noon|midday|midnight|late|close)`;
const TIME_STRICT = String.raw`(?:\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2}|noon|midday|midnight|late)`;
const HOURS_RE = new RegExp(
  String.raw`\b${DAYS}\b(?:\s*(?:-|–|to|&|,)\s*\b${DAYS}\b)*[\s:,\-–]*(?:(?:${TIME})\s*(?:-|–|to|till|til|until)\s*(?:${TIME})|closed)`,
  "gi",
);
const AU_PHONE_RE = /(?<!\d)(?:\+?61[\s-]?\(?0?\)?[2-478](?:[\s-]?\d){8}|\(?0[2-478]\)?(?:[\s-]?\d){8}|1[38]00(?:[\s-]?\d){6}|13(?:[\s-]?\d){4})(?!\d)/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const STREET_TYPES = "St|Street|Rd|Road|Tce|Terrace|Ave|Avenue|Pde|Parade|Lane|Ln|Mall|Place|Pl|Sq|Square|Hwy|Highway|Dr|Drive|Way|Blvd|Crt|Court|Cres|Crescent|Cct|Circuit|Esp|Esplanade|Arcade";
const STATES = "SA|NSW|VIC|QLD|WA|TAS|NT|ACT";
const AU_ADDR_RE = new RegExp(
  String.raw`[^\n|]{0,80}?\b\d{1,4}[A-Za-z]?(?:\/\d+)?\s+[A-Z][A-Za-z'\s]{2,40}\b(?:${STREET_TYPES})\b\.?[^\n|]{0,60}?(?:\b(?:${STATES})\b\s*,?\s*)?\b\d{4}\b`,
  "gi",
);
const STREET_START = new RegExp(
  String.raw`#?\b\d{1,4}[A-Za-z]?(?:\/\d+)?\s+(?:[A-Za-z'][A-Za-z'.]*\s+){1,4}?(?:${STREET_TYPES})\b`,
  "i",
);
const PRICE_STRICT_RE = /\$\s?\d{1,3}(?:\.\d{1,2})?|(?<![\d.:])\b\d{1,2}\.\d{1,2}\b(?![\d.:%]|\s*(?:am|pm))/i;
const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
const CSS_VAR_RE = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g;

const SOCIAL: Record<"facebook" | "instagram" | "tiktok", RegExp> = {
  facebook:  /facebook\.com\/(?!sharer|share|plugins|tr\b|dialog)/i,
  instagram: /instagram\.com\/(?!p\/|explore)/i,
  tiktok:    /tiktok\.com\/@/i,
};

const ORDERING: Record<string, RegExp> = {
  "Uber Eats":     /ubereats\.com/i,
  "DoorDash":      /doordash\.com/i,
  "Menulog":       /menulog\.com\.au/i,
  "Mr Yum":        /mryum\.(?:com|page)/i,
  "me&u":          /meandu\.(?:app|com)/i,
  "Bopple":        /bopple\.(?:app|me|com)/i,
  "HungryHungry":  /hungryhungry\.com/i,
  "Deliveroo":     /deliveroo\./i,
  "Square Online": /square\.site|squareup\.com\/store/i,
  "Abacus":        /abacus\.co|orderup/i,
  "Restoplus":     /restoplus\.com/i,
  "AI Menu":       /ai-menu\.com/i,
  "Online ordering": /\/\/order\.|\/order-online|\/online-order/i,
  "Other ordering": /tabsquare|orderaway|mobi2go|gloriafood|foodbooking|ordermate|eatclub/i,
};
const BOOKING = /opentable\.|resdiary\.|sevenrooms\.|nowbookit\.|obee\.com|tablein\.|quandoo\.|bookings?\.\w/i;

const SKIP_IMG = /logo|icon|favicon|sprite|badge|payment|visa|mastercard|arrow|spinner|loader|placeholder|pixel|tracking|avatar|\.svg(\?|$)|data:image/i;

// Builder and framework defaults that are never a brand colour.
const FRAMEWORK_COLOURS = new Set([
  "#0073aa", "#007cba", "#0693e3", "#cf2e2e", "#ff6900", "#fcb900", "#7bdcb5", "#00d084",
  "#8ed1fc", "#abb8c3", "#f78da7", "#9b51e0", "#6ec1e4", "#54595f", "#7a7a7a", "#61ce70",
  "#4054b2", "#23a455", "#116dff", "#3899ec", "#0000ff", "#ff0000", "#00ff00", "#1e73be",
  "#2ea3f2", "#e02b20", "#edf000", "#8300e9", "#e09900", "#7cda24", "#0c71c3", "#ff4f00",
  "#96588a", "#5c9dd0", "#4285f4", "#34a853", "#fbbc05", "#ea4335", "#3b5998", "#1877f2",
  "#e1306c", "#1da1f2", "#2271b1", "#135e96", "#3858e9", "#0d6efd", "#6610f2", "#6f42c1",
  "#d63384", "#dc3545", "#fd7e14", "#ffc107", "#198754", "#20c997", "#0dcaf0", "#007bff",
  "#28a745", "#17a2b8",
  // UIkit (Shopify themes) and Kadence / Tailwind palette defaults
  "#1e87f0", "#f0506e", "#32d296", "#faa05a", "#3182ce", "#2b6cb0", "#1a202c", "#2d3748",
  "#4a5568", "#718096", "#edf2f7", "#f7fafc",
]);

// ─── Small helpers ──────────────────────────────────────────────────────────

function abs(href: string | undefined | null, base: string): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h || h.startsWith("data:") || h.startsWith("javascript:")) return null;
  try { return new URL(h, base).toString(); } catch { return null; }
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

export function sameSite(a: string, b: string): boolean {
  const ha = hostOf(a), hb = hostOf(b);
  return Boolean(ha) && (ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`));
}

function uniq<T>(xs: T[]): T[] { return [...new Set(xs)]; }

function dec(s: string): string { try { return decodeURIComponent(s); } catch { return s; } }

function clean(s: string): string { return s.replace(/[ \t\u00a0\u200b]+/g, " ").trim(); }

// ─── Page parsing ───────────────────────────────────────────────────────────

export type ParsedPage = {
  url:   string;
  html:  string;
  root:  HTMLElement;
  text:  string;          // visible text, one line per block
  meta:  Record<string, string | null>;
  jsonld: Record<string, unknown>[];
  biz:   Record<string, unknown> | null;
};

const BIZ_TYPES = new Set(["Restaurant", "LocalBusiness", "FoodEstablishment", "CafeOrCoffeeShop", "BarOrPub",
  "FastFoodRestaurant", "Bakery", "Store", "IceCreamShop", "Winery", "Brewery", "Distillery"]);

export function parsePage(html: string, url: string): ParsedPage {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  const jsonld = parseJsonLd(root);
  const biz = jsonld.find(n => typesOf(n).some(t => BIZ_TYPES.has(t)))
    ?? jsonld.find(n => typesOf(n).includes("Organization"))
    ?? null;
  return { url, html, root, text: visibleText(html), meta: metaTags(root, url), jsonld, biz };
}

export function visibleText(html: string): string {
  const r = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  for (const sel of ["script", "style", "noscript", "template", "svg", "iframe", "head"]) {
    for (const el of r.querySelectorAll(sel)) el.remove();
  }
  const body = r.querySelector("body") ?? r;
  // One line per text node (like BeautifulSoup get_text("\n")), so a dish name
  // and its price in neighbouring spans don't run together as "Sando23.95".
  const lines: string[] = [];
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === NodeType.TEXT_NODE) lines.push(...child.text.split("\n").map(clean));
      else if (child.nodeType === NodeType.ELEMENT_NODE) walk(child);
    }
  };
  walk(body);
  const out: string[] = [];
  let prev: string | null = null;
  for (const ln of lines) {
    if (ln && ln !== prev) out.push(ln);
    prev = ln;
  }
  return out.join("\n");
}

function typesOf(n: Record<string, unknown>): string[] {
  const t = n["@type"];
  if (typeof t === "string") return [t];
  return Array.isArray(t) ? t.map(String) : [];
}

function parseJsonLd(root: HTMLElement): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  for (const s of root.querySelectorAll("script")) {
    if (!/ld\+json/i.test(s.getAttribute("type") ?? "")) continue;
    const raw = s.rawText.trim();
    if (!raw) continue;
    let data: unknown;
    try { data = JSON.parse(raw); } catch {
      try { data = JSON.parse(raw.replace(/\n/g, " ").replace(/,\s*([}\]])/g, "$1")); } catch { continue; }
    }
    const stack: unknown[] = Array.isArray(data) ? [...data] : [data];
    while (stack.length) {
      const n = stack.pop();
      if (Array.isArray(n)) stack.push(...n);
      else if (n && typeof n === "object") {
        const o = n as Record<string, unknown>;
        if (o["@graph"]) stack.push(o["@graph"]);
        nodes.push(o);
      }
    }
  }
  return nodes;
}

function metaTags(root: HTMLElement, base: string): Record<string, string | null> {
  const get = (attr: "name" | "property", key: string): string | null => {
    for (const m of root.querySelectorAll("meta")) {
      if ((m.getAttribute(attr) ?? "").toLowerCase() === key) {
        const c = m.getAttribute("content");
        if (c) return clean(c);
      }
    }
    return null;
  };
  const out: Record<string, string | null> = {
    title:            root.querySelector("title")?.text ? clean(root.querySelector("title")!.text) : null,
    description:      get("name", "description"),
    "og:title":       get("property", "og:title"),
    "og:description": get("property", "og:description"),
    "og:image":       abs(get("property", "og:image"), base),
    "og:site_name":   get("property", "og:site_name"),
    "theme-color":    get("name", "theme-color"),
    "apple-touch-icon": null,
    favicon:          null,
    generator:        get("name", "generator"),
  };
  for (const l of root.querySelectorAll("link")) {
    const rel = (l.getAttribute("rel") ?? "").toLowerCase();
    const href = abs(l.getAttribute("href"), base);
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) out["apple-touch-icon"] ??= href;
    else if (/\bicon\b/.test(rel)) out.favicon ??= href;
  }
  return out;
}

export function detectPlatform(html: string, meta: Record<string, string | null>): string | null {
  const h = html.slice(0, 400_000);
  const checks: [string, RegExp][] = [
    ["Squarespace", /squarespace/i], ["Wix", /wix\.com|wixstatic/i], ["Shopify", /cdn\.shopify|Shopify\.theme/i],
    ["Webflow", /webflow/i], ["BentoBox", /getbento|bentobox/i], ["Framer", /framerusercontent|framer\.com/i],
    ["Restoplus", /restoplus/i], ["WordPress", /wp-content|wp-includes/i], ["GoDaddy", /img1\.wsimg|godaddy/i],
    ["Duda", /dudaone|multiscreensite/i], ["Weebly", /weebly/i], ["Next.js", /__NEXT_DATA__|\/_next\//i],
  ];
  const found = checks.filter(([, rx]) => rx.test(h)).map(([n]) => n);
  return found[0] ?? (meta.generator ? meta.generator.split(" ")[0]! : null);
}

/** Thin text plus app-shell markers usually means the content is drawn by JavaScript. */
export function looksJsRendered(html: string, text: string): boolean {
  const ratio = text.length / Math.max(1, html.length);
  return text.length < 600 || (ratio < 0.01 && text.length < 1500);
}

// ─── Name / description ─────────────────────────────────────────────────────

export function guessName(p: ParsedPage): { value: string | null; source: string | null } {
  const bizName = p.biz?.name;
  if (typeof bizName === "string" && bizName.trim()) {
    return { value: bizName.split(/\s[|\-–—:]\s/)[0]!.trim(), source: "JSON-LD" };
  }
  if (p.meta["og:site_name"]) return { value: p.meta["og:site_name"], source: "og:site_name" };
  const t = p.meta["og:title"] ?? p.meta.title;
  if (t) return { value: t.split(/\s[|\-–—:]\s/)[0]!.trim(), source: "page title" };
  return { value: null, source: null };
}

// ─── Contact details ────────────────────────────────────────────────────────

export function findPhones(p: ParsedPage): { values: string[]; source: string | null } {
  const ld = p.biz?.telephone;
  if (typeof ld === "string" && ld.trim()) return { values: [ld.trim()], source: "JSON-LD" };
  const tel = uniq(p.root.querySelectorAll("a")
    .map(a => a.getAttribute("href") ?? "")
    .filter(h => /^tel:/i.test(h))
    .map(h => dec(h.slice(4)).trim())
    .filter(v => v.replace(/\D/g, "").length >= 6));
  if (tel.length) return { values: tel, source: "phone links" };
  const found = uniq([...p.text.matchAll(AU_PHONE_RE)].map(m => clean(m[0])));
  return { values: found, source: found.length ? "page text" : null };
}

function cfDecode(hex: string): string | null {
  try {
    const k = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k);
    return /@/.test(out) ? out : null;
  } catch { return null; }
}

export function findEmails(p: ParsedPage): { values: string[]; source: string | null } {
  const cf: string[] = [];
  for (const el of p.root.querySelectorAll("[data-cfemail]")) {
    const v = cfDecode(el.getAttribute("data-cfemail") ?? "");
    if (v) cf.push(v);
  }
  for (const a of p.root.querySelectorAll("a")) {
    const m = (a.getAttribute("href") ?? "").match(/email-protection#([0-9a-f]+)/i);
    const v = m ? cfDecode(m[1]!) : null;
    if (v) cf.push(v);
  }
  if (cf.length) return { values: uniq(cf.map(e => e.toLowerCase())), source: "email link (decoded)" };
  const mailto = uniq(p.root.querySelectorAll("a")
    .map(a => a.getAttribute("href") ?? "")
    .filter(h => /^mailto:/i.test(h))
    .map(h => dec(h.slice(7).split("?")[0]!).trim().toLowerCase())
    .filter(Boolean));
  if (mailto.length) return { values: mailto, source: "email links" };
  const found = uniq([...p.text.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase())
    .filter(e => !/\.(png|jpe?g|webp|gif)$|sentry|wixpress|example\./i.test(e)));
  return { values: found, source: found.length ? "page text" : null };
}

function oneLine(s: string): string {
  return s.replace(/\s*\n\s*/g, ", ").replace(/,\s*,/g, ",").replace(/,?\s*Australia\s*$/i, "").replace(/\s{2,}/g, " ").trim();
}

function addressFromLd(a: unknown): string | null {
  if (typeof a === "string") return oneLine(a) || null;
  if (Array.isArray(a)) return a.length ? addressFromLd(a[0]) : null;
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    const parts = [o.streetAddress, o.addressLocality, o.addressRegion, o.postalCode].filter(x => typeof x === "string" && x.trim());
    return parts.length ? oneLine(parts.join(", ")) : null;
  }
  return null;
}

/** Suburb from JSON-LD, else the word(s) before the state/postcode in an AU address. */
export function suburbFrom(p: ParsedPage | null, address: string | null): string | null {
  const ld = p?.biz?.address;
  const locality = ld && typeof ld === "object" && !Array.isArray(ld) ? (ld as Record<string, unknown>).addressLocality : null;
  if (typeof locality === "string" && locality.trim()) return titleCase(locality.trim());
  if (!address) return null;
  const m = address.match(new RegExp(String.raw`(?:,|\b(?:${STREET_TYPES})\b\.?)\s*([A-Za-z][A-Za-z' ]{1,30}?)\s*,?\s*(?:${STATES})?\s*,?\s*\d{4}\b`, "i"));
  return m?.[1] ? titleCase(m[1].trim()) : null;
}

function titleCase(s: string): string {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : s;
}

export function findAddresses(p: ParsedPage): { values: string[]; source: string | null; multiple: boolean } {
  const ld = addressFromLd(p.biz?.address);
  const joined = p.text.replace(/\s*\n\s*/g, " ");
  const cands: { score: number; a: string }[] = [];
  for (const m of joined.matchAll(AU_ADDR_RE)) {
    let a = m[0].replace(/^.*?(?:address|location|find us|visit us)\s*:?\s*/i, "").replace(/^[\s|,]+|[\s|,]+$/g, "");
    const st = a.match(STREET_START);
    if (st?.index !== undefined) a = a.slice(st.index).replace(/^#/, "");
    const start = m.index ?? 0;
    const ctx = joined.slice(Math.max(0, start - 120), start).toLowerCase();
    let score = 0;
    if (/address|contact|find us|location|visit/.test(ctx)) score += 2;
    if (/park|parking|car park|wilson|upark/.test(ctx + m[0].toLowerCase())) score -= 4;
    const near = joined.slice(Math.max(0, start - 200), start + m[0].length + 200);
    if (new RegExp(AU_PHONE_RE.source).test(near)) score += 2;
    cands.push({ score, a: clean(a) });
  }
  const seen = new Set<string>();
  const ranked = cands.sort((x, y) => y.score - x.score).filter(c => {
    const k = c.a.toLowerCase().replace(/\W+/g, "").slice(0, 25);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const multiple = ranked.filter(c => c.score >= 0).length > 1;
  if (ld) return { values: uniq([ld, ...ranked.map(c => c.a)]).slice(0, 6), source: "JSON-LD", multiple };
  return { values: ranked.map(c => c.a).slice(0, 6), source: ranked.length ? "page text" : null, multiple };
}

// ─── Hours ──────────────────────────────────────────────────────────────────

const LD_DAY: Record<string, DayKey> = {
  monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun",
  mo: "mon", tu: "tue", we: "wed", th: "thu", fr: "fri", sa: "sat", su: "sun",
};

export function toHHMM(t: string | null | undefined): string | null {
  if (!t) return null;
  const s = t.trim().toLowerCase();
  if (/^(noon|midday)$/.test(s)) return "12:00";
  if (s === "midnight") return "23:59";
  const m = s.match(/^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h === 24 && min === 0) return "23:59";
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Collapse sessions per day into the one open/close the settings can hold. */
export function weekFromSessions(sessions: Partial<Record<DayKey, Session[]>>, statedDays: Set<DayKey>): Record<DayKey, DayHours> {
  const week = {} as Record<DayKey, DayHours>;
  for (const d of DAY_KEYS) {
    const list = (sessions[d] ?? []).filter(s => s.open && s.close).sort((a, b) => a.open.localeCompare(b.open));
    if (list.length) {
      // a close earlier than the open means past midnight; keep the latest
      const close = list.map(s => s.close).sort().at(-1)!;
      week[d] = { open: list[0]!.open, close, closed: false };
    } else {
      week[d] = { open: "09:00", close: "21:00", closed: statedDays.has(d) };
    }
  }
  return week;
}

export function hoursFromJsonLd(biz: Record<string, unknown> | null): ImportedHours | null {
  if (!biz) return null;
  const sessions: Partial<Record<DayKey, Session[]>> = {};
  const stated = new Set<DayKey>();
  const add = (d: DayKey, open: string | null, close: string | null) => {
    stated.add(d);
    if (open && close && !(open === "00:00" && close === "00:00")) (sessions[d] ??= []).push({ open, close });
  };

  const spec = biz.openingHoursSpecification;
  const specs = Array.isArray(spec) ? spec : spec ? [spec] : [];
  for (const s of specs) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const days = Array.isArray(o.dayOfWeek) ? o.dayOfWeek : [o.dayOfWeek];
    for (const raw of days) {
      const key = LD_DAY[String(raw ?? "").split("/").pop()!.toLowerCase()];
      if (key) add(key, toHHMM(String(o.opens ?? "")), toHHMM(String(o.closes ?? "")));
    }
  }

  // "Mo-Fr 11:00-21:00", "Sa 10:00-22:00"
  const oh = biz.openingHours;
  const ohList = Array.isArray(oh) ? oh : typeof oh === "string" ? oh.split(/,(?=\s*[A-Za-z])/) : [];
  for (const line of ohList.map(String)) {
    const m = line.trim().match(/^([A-Za-z,\s-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) continue;
    for (const part of m[1]!.split(",")) {
      const [a, b] = part.trim().split("-").map(x => LD_DAY[x.trim().toLowerCase().slice(0, 2)]);
      if (!a) continue;
      const ia = DAY_KEYS.indexOf(a);
      const ib = b ? DAY_KEYS.indexOf(b) : ia;
      for (let i = ia; ; i = (i + 1) % 7) {
        add(DAY_KEYS[i]!, toHHMM(m[2]), toHHMM(m[3]));
        if (i === ib) break;
      }
    }
  }

  if (!stated.size) return null;
  return { week: weekFromSessions(sessions, stated), sessions };
}

/** Raw day/time lines from page text. Given to the AI as hints and shown to staff. */
export function hoursLines(text: string): string[] {
  const lines: string[] = [];
  const t = text.replace(new RegExp(String.raw`\b(${DAYS})\.`, "gi"), "$1");
  const push = (s: string) => { const v = clean(s); if (v && !lines.includes(v)) lines.push(v); };
  const extras = [
    new RegExp(String.raw`(?:${TIME_STRICT}|\d{1,2})\s*(?:-|–|to|till|until)\s*(?:${TIME_STRICT})\s*,?\s*\b${DAYS}\b(?:\s*(?:-|–|to)\s*\b${DAYS}\b)?`, "gi"),
    new RegExp(String.raw`(?:open\s+)?(?:daily|every ?day|7 days(?: a week)?)\s*(?:from\s+)?(?:${TIME_STRICT})(?:\s*(?:-|–|to|till|until)\s*(?:${TIME_STRICT}))?`, "gi"),
  ];
  for (const rx of extras) for (const ln of t.split("\n")) for (const m of ln.matchAll(rx)) push(m[0]);
  for (const m of t.replace(/\n/g, " \u2029 ").matchAll(HOURS_RE)) push(m[0].replace(/\u2029/g, " "));
  const tl = t.split("\n");
  for (let i = 0; i < tl.length - 1; i++) {
    const ln = tl[i]!.trim();
    if (new RegExp(String.raw`^${DAYS}(\s*(-|–|to|&)\s*${DAYS})?:?$`, "i").test(ln) || /^(lunch|dinner|breakfast|brunch|kitchen)\s*:?$/i.test(ln)) {
      const nxt = tl[i + 1]!.trim();
      if (new RegExp(TIME, "i").test(nxt) || /closed/i.test(nxt)) push(`${ln} ${nxt}`);
    }
  }
  return lines.slice(0, 20);
}

// ─── Links ──────────────────────────────────────────────────────────────────

export function findLinks(p: ParsedPage) {
  const hrefs = uniq(p.root.querySelectorAll("a").map(a => abs(a.getAttribute("href"), p.url)).filter((h): h is string => Boolean(h)));
  const social: Partial<Record<"facebook" | "instagram" | "tiktok", string>> = {};
  for (const [k, rx] of Object.entries(SOCIAL) as ["facebook" | "instagram" | "tiktok", RegExp][]) {
    const h = hrefs.find(x => rx.test(x));
    if (h) social[k] = h;
  }
  const ordering: { name: string; url: string }[] = [];
  for (const [name, rx] of Object.entries(ORDERING)) {
    for (const h of hrefs.filter(x => rx.test(x)).slice(0, 2)) ordering.push({ name, url: h });
  }
  const booking = hrefs.find(h => BOOKING.test(h) && !sameSite(h, p.url)) ?? null;
  return { social, ordering, booking };
}

export function menuCandidates(p: ParsedPage): { url: string; score: number; pdf: boolean }[] {
  const best = new Map<string, { url: string; score: number; pdf: boolean }>();
  for (const a of p.root.querySelectorAll("a")) {
    const h = abs(a.getAttribute("href"), p.url)?.split("#")[0];
    if (!h || !/^https?:/.test(h) || h.replace(/\/$/, "") === p.url.replace(/\/$/, "")) continue;
    const text = clean(a.text);
    let path = "";
    try { path = new URL(h).pathname.toLowerCase(); } catch { continue; }
    const pdf = /\.pdf$/i.test(path);
    let score = 0;
    if (/menu/.test(path) || /\bmenus?\b/i.test(text)) score += 5;
    else if (/food|eat|dine|drinks?/i.test(`${path} ${text}`)) score += 2;
    else if (/order/i.test(`${path} ${text}`)) score += 1;
    if (pdf) score += 3;
    if (!score) continue;
    if (!sameSite(h, p.url) && !pdf) continue; // never follow third-party pages
    if (/press|review|news|blog|careers|jobs|gift|voucher/i.test(path)) continue;
    const prev = best.get(h);
    if (!prev || prev.score < score) best.set(h, { url: h, score, pdf });
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

export function contactCandidate(p: ParsedPage): string | null {
  for (const a of p.root.querySelectorAll("a")) {
    const h = abs(a.getAttribute("href"), p.url)?.split("#")[0];
    if (!h || !sameSite(h, p.url) || h.replace(/\/$/, "") === p.url.replace(/\/$/, "")) continue;
    let path = "";
    try { path = new URL(h).pathname; } catch { continue; }
    if (/hours|contact|location|find[- ]us|visit/i.test(`${a.text} ${path}`) && !/\.pdf$/i.test(path)) return h;
  }
  return null;
}

/** PDF links: anchors plus PDF URLs tucked into script config (flipbook plugins). */
export function pdfLinks(p: ParsedPage, menuOnly: boolean): string[] {
  const anchors = p.root.querySelectorAll("a")
    .filter(a => {
      const h = a.getAttribute("href") ?? "";
      return /\.pdf(\?|$)/i.test(h) && (!menuOnly || /menu|food|drink|lunch|dinner|breakfast/i.test(`${h} ${a.text}`));
    })
    .map(a => abs(a.getAttribute("href"), p.url))
    .filter((h): h is string => Boolean(h));
  const inScripts = [...p.html.matchAll(/https?:(?:\\?\/){2}[^"'\s<>]+?\.pdf(?![\w.-])(?:\?[^"'\s<>\\]*)?/gi)]
    .map(m => m[0].replace(/\\\//g, "/"))
    .filter(u => !menuOnly || /menu|food|drink|lunch|dinner|breakfast/i.test(u));
  return uniq([...anchors, ...inScripts]);
}

function imgSrc(img: HTMLElement, base: string): string | null {
  for (const attr of ["src", "data-src", "data-image", "data-lazy-src", "data-original"]) {
    const v = img.getAttribute(attr);
    if (v && !v.startsWith("data:")) return abs(v, base);
  }
  const ss = img.getAttribute("srcset") ?? img.getAttribute("data-srcset");
  if (ss) {
    const parts = ss.split(",").map(x => x.trim().split(/\s+/)[0]).filter(Boolean);
    if (parts.length) return abs(parts.at(-1)!, base);
  }
  return null;
}

export function menuImages(p: ParsedPage): string[] {
  return uniq(p.root.querySelectorAll("img")
    .filter(img => {
      const blob = `${img.getAttribute("alt") ?? ""} ${img.getAttribute("src") ?? ""} ${img.getAttribute("data-src") ?? ""}`.toLowerCase();
      return blob.includes("menu") && !/\.svg|click-menu|menu-icon|hamburger|menu-toggle|burger-menu|nav/.test(blob);
    })
    .map(img => imgSrc(img, p.url))
    .filter((s): s is string => Boolean(s))).slice(0, 6);
}

// ─── Logo, photos, colours ──────────────────────────────────────────────────

export function logoCandidates(p: ParsedPage): { url: string; score: number; why: string }[] {
  const out: { url: string; score: number; why: string }[] = [];
  for (const img of p.root.querySelectorAll("img")) {
    const src = imgSrc(img, p.url);
    if (!src) continue;
    const blob = `${img.getAttribute("class") ?? ""} ${img.getAttribute("id") ?? ""} ${img.getAttribute("alt") ?? ""} ${src}`.toLowerCase();
    let parentBlob = "";
    let inHeader = false;
    for (let el = img.parentNode as HTMLElement | null, i = 0; el && i < 6; el = el.parentNode as HTMLElement | null, i++) {
      const tag = el.rawTagName?.toLowerCase();
      if (tag === "header") inHeader = true;
      parentBlob += ` ${el.getAttribute?.("class") ?? ""} ${el.getAttribute?.("id") ?? ""}`;
    }
    parentBlob = parentBlob.toLowerCase();
    let score = 0;
    if (blob.includes("logo") || src.includes("/logos/")) score += 3;
    if (/logo|brand/.test(parentBlob)) score += 2;
    if (inHeader) score += 1;
    if (score) out.push({ url: src, score, why: blob.includes("logo") ? "image labelled logo" : "image in the site header" });
  }
  const ldLogo = p.biz?.logo;
  const ld = typeof ldLogo === "string" ? ldLogo : ldLogo && typeof ldLogo === "object" ? (ldLogo as Record<string, unknown>).url : null;
  if (typeof ld === "string") { const u = abs(ld, p.url); if (u) out.push({ url: u, score: 3, why: "JSON-LD logo" }); }
  if (p.meta["apple-touch-icon"]) out.push({ url: p.meta["apple-touch-icon"], score: 0.5, why: "app icon" });
  const seen = new Set<string>();
  return out
    // .ico files and the builders' own default icons are never the venue's logo
    .filter(c => !/\.ico(\?|$)|pfavico|static\.parastorage\.com\/client|squarespace\.com\/universal|\/favicon/i.test(c.url))
    .sort((a, b) => b.score - a.score)
    .filter(c => !seen.has(c.url) && Boolean(seen.add(c.url)))
    .slice(0, 6);
}

export function findPhotos(p: ParsedPage, logoUrls: Set<string>): { url: string; alt: string | null }[] {
  const out: { url: string; alt: string | null }[] = [];
  const push = (url: string | null, alt: string | null) => {
    if (url && !logoUrls.has(url) && !SKIP_IMG.test(url) && !out.some(o => o.url === url)) out.push({ url, alt });
  };
  if (p.meta["og:image"]) push(p.meta["og:image"], null);
  for (const img of p.root.querySelectorAll("img")) {
    const src = imgSrc(img, p.url);
    const alt = img.getAttribute("alt") ?? null;
    if (!src || SKIP_IMG.test(alt ?? "")) continue;
    const w = parseInt((img.getAttribute("width") ?? (img.getAttribute("data-image-dimensions") ?? "").split("x")[0] ?? "").replace("px", ""), 10);
    let big = (Number.isFinite(w) && w >= 400) || Boolean(img.getAttribute("srcset") || img.getAttribute("data-srcset"))
      || /squarespace|wixstatic|restoplus\.com\/images\/(?!.*logos)|cdn\.shopify|wp-content\/uploads|images\.ctfassets|cloudinary|imgix|_next\/image|framerusercontent/.test(src);
    if (Number.isFinite(w) && w < 200) big = false;
    if (big) push(src, alt);
  }
  for (const el of p.root.querySelectorAll("[style]")) {
    const m = (el.getAttribute("style") ?? "").match(/background(?:-image)?\s*:[^;]*url\(['"]?([^'")]+)/i);
    if (m) push(abs(m[1], p.url), null);
  }
  return out.slice(0, 20);
}

function normHex(h: string): string {
  let x = h.toLowerCase().replace(/^#/, "");
  if (x.length === 3) x = x.split("").map(c => c + c).join("");
  return `#${x.slice(0, 6)}`;
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function isGrey(hex: string): boolean {
  const { s, l } = hsl(hex);
  return s < 0.18 || l < 0.08 || l > 0.95;
}

function tooClose(a: string, b: string): boolean {
  const x = hsl(a), y = hsl(b);
  const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h));
  return dh < 12 && Math.abs(x.l - y.l) < 0.12 && Math.abs(x.s - y.s) < 0.2;
}

export function stylesheetLinks(p: ParsedPage): string[] {
  return p.root.querySelectorAll("link")
    .filter(l => /stylesheet/i.test(l.getAttribute("rel") ?? ""))
    .map(l => abs(l.getAttribute("href"), p.url))
    .filter((h): h is string => Boolean(h) && !/fonts\.googleapis|font-?awesome|bootstrap(\.min)?\.css|block-library|dashicons|jquery|elementor\/assets\/lib|woocommerce/i.test(h!))
    .sort((a, b) => Number(!/theme|style|site|custom|main|app|global|static/i.test(a)) - Number(!/theme|style|site|custom|main|app|global|static/i.test(b)))
    .slice(0, 3);
}

export function pickColours(p: ParsedPage, cssTexts: string[]): { suggested: string; swatches: string[]; source: string } | null {
  const counts = new Map<string, number>();
  const vars = new Map<string, string>();
  const inline = p.root.querySelectorAll("style").map(s => s.rawText).join(" ")
    + " " + p.root.querySelectorAll("[style]").map(el => el.getAttribute("style") ?? "").join(" ");
  const blobs: [string, number][] = [[inline, 3], ...cssTexts.map(t => [t.slice(0, 600_000), 1] as [string, number])];
  for (const [txt, weight] of blobs) {
    for (const m of txt.matchAll(CSS_VAR_RE)) if (m[2]!.startsWith("#") && !vars.has(m[1]!)) vars.set(m[1]!, normHex(m[2]!));
    for (const m of txt.matchAll(HEX_RE)) { const c = normHex(m[0]); counts.set(c, (counts.get(c) ?? 0) + weight); }
    for (const m of txt.matchAll(RGB_RE)) {
      const c = `#${[m[1], m[2], m[3]].map(x => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("")}`;
      counts.set(c, (counts.get(c) ?? 0) + weight);
    }
  }
  const usable = (c: string) => /^#[0-9a-f]{6}$/.test(c) && !isGrey(c) && !FRAMEWORK_COLOURS.has(c);
  const theme = p.meta["theme-color"] && /^#[0-9a-f]{3,8}$/i.test(p.meta["theme-color"]) ? normHex(p.meta["theme-color"]) : null;
  const brandVars = [...vars.entries()].filter(([k, v]) => /brand|primary|accent|secondary|main|theme/i.test(k) && usable(v)).map(([, v]) => v);
  const frequent = [...counts.entries()].filter(([c]) => usable(c)).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const swatches: string[] = [];
  for (const c of [...(theme && usable(theme) ? [theme] : []), ...brandVars, ...frequent]) {
    if (swatches.length >= 5) break;
    if (!swatches.some(s => tooClose(s, c))) swatches.push(c);
  }
  if (!swatches.length) return null;
  const source = theme && usable(theme) ? "theme-color tag" : brandVars.length ? "brand colour in their CSS" : "most used colour in their CSS";
  return { suggested: swatches[0]!, swatches, source };
}

// ─── Menu fallback (no AI) ──────────────────────────────────────────────────

/** Lines with a price, name on the same or previous line. Used only when the AI read isn't available. */
export function menuItemsByPattern(text: string): ImportedMenuItem[] {
  const raw = text.split("\n").map(l => l.replace(/\u200b/g, "").trim()).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "$" && i + 1 < raw.length) { lines.push(`$${raw[i + 1]}`); i++; } else lines.push(raw[i]!);
  }
  const TAG = /^(?:\(?[A-Z]{1,4}\)?(?:\s*[,/]\s*\(?[A-Z]{1,4}\)?)*|\(?[A-Z][a-z]{0,2}\)?|[a-z][a-z ]{0,15}|[Ss]tarts at|[Ff]rom|[Ee]ach|[Nn]ew|\d+\s*(?:[Pp]cs?|pieces)|\/pp|[Oo]pt\..*)$/;
  const items: ImportedMenuItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]!;
    const m = ln.match(PRICE_STRICT_RE);
    const bare = /^\$?\s?\d{1,3}(?:\.\d{1,2})?(?:\s*\/\s*\$?\d{1,3}(?:\.\d{1,2})?)?$/.test(ln);
    if (!m && !bare) continue;
    if (/\b(am|pm)\b|\d{4}|phone|call|\bSA\b|street|%|min|km|years?|byo|cakeage|surcharge|corkage/i.test(ln)) continue;
    const price = Number((m ? m[0] : ln).replace(/[^\d.]/g, "")) || null;
    let name: string | null = ln.replace(PRICE_STRICT_RE, "").replace(/^[\s\-–|.$:]+|[\s\-–|.$:]+$/g, "");
    if ((!name || name.length < 3 || TAG.test(name)) && i > 0) {
      let j = i - 1, steps = 0;
      while (j >= 0 && steps < 4 && (PRICE_STRICT_RE.test(lines[j]!) && lines[j]!.replace(PRICE_STRICT_RE, "").trim().length < 2 || lines[j]!.length < 3 || TAG.test(lines[j]!))) { j--; steps++; }
      name = j >= 0 && !PRICE_STRICT_RE.test(lines[j]!) ? lines[j]! : null;
    }
    if (name && name.length > 2 && name.length < 120) items.push({ name, price });
  }
  const seen = new Set<string>();
  return items.filter(it => { const k = `${it.name.toLowerCase()}|${it.price}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 200);
}

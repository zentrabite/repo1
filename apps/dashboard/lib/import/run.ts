// ─── Website import: orchestration ──────────────────────────────────────────
// 1. Fetch the home page (same-site rules, size and time limits).
// 2. Read structured data and patterns from it.
// 3. Follow at most 2 menu pages, 1 contact/hours page, 2 menu PDFs,
//    3 menu images and 3 stylesheets. Never off-site pages except PDFs.
// 4. Ask Claude to read everything into one record (if a key is set).
// 5. Merge the two, and mark anything staff must check with the owner.

import { sniffImage } from "@/lib/image-check";
import { aiExtract, IMPORT_MODEL, type AiOutput } from "./ai";
import {
  contactCandidate, detectPlatform, findAddresses, findEmails, findLinks, findPhones, findPhotos, guessName,
  hoursFromJsonLd, hoursLines, logoCandidates, looksJsRendered, menuCandidates, menuImages, menuItemsByPattern,
  parsePage, pdfLinks, pickColours, sameSite, stylesheetLinks, suburbFrom, toHHMM, weekFromSessions, type ParsedPage,
} from "./extract";
import { decodeText, ImportFetchError, normaliseUrl, safeFetch } from "./safe-fetch";
import {
  DAY_KEYS, type DayKey, type ImportField, type ImportedHours, type ImportedMenuCategory, type ImportResult, type Session,
} from "./types";

const HTML_MAX  = 3 * 1024 * 1024;
const CSS_MAX   = 1024 * 1024;
const PDF_MAX   = 10 * 1024 * 1024;
const IMG_MAX   = 4 * 1024 * 1024;
const PAGE_CHARS = 30_000;     // per page sent to the AI
const TOTAL_CHARS = 90_000;    // all pages sent to the AI

// Pages we can't import from. Staff should paste the venue's own website.
const NOT_OWN_SITE = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.page|facebook\.com|fb\.com|instagram\.com|tiktok\.com|ubereats\.com|doordash\.com|menulog\.com\.au|deliveroo\.[a-z.]+|tripadvisor\.[a-z.]+|yelp\.[a-z.]+|zomato\.com|opentable\.[a-z.]+)$/i;

function field<T>(value: T | null, source: string | null, confidence: ImportField<T>["confidence"], check?: string | null, quote?: string | null): ImportField<T> {
  return { value, source, confidence: value === null ? "none" : confidence, check: check ?? null, quote: quote ?? null };
}

async function fetchPage(url: string, timeoutMs: number): Promise<ParsedPage | null> {
  try {
    const doc = await safeFetch(url, { maxBytes: HTML_MAX, timeoutMs, truncate: true });
    if (!/html|xml|text\/plain/.test(doc.contentType) && doc.contentType) return null;
    return parsePage(decodeText(doc), doc.url);
  } catch { return null; }
}

async function fetchPdf(url: string, timeoutMs: number): Promise<{ url: string; data: Buffer } | null> {
  try {
    const doc = await safeFetch(url, { maxBytes: PDF_MAX, timeoutMs, accept: "application/pdf,*/*;q=0.5" });
    if (doc.body.subarray(0, 5).toString("ascii") !== "%PDF-") return null;
    return { url: doc.url, data: doc.body };
  } catch { return null; }
}

async function fetchImage(url: string, timeoutMs: number): Promise<{ url: string; data: Buffer; mediaType: string } | null> {
  try {
    const doc = await safeFetch(url, { maxBytes: IMG_MAX, timeoutMs, accept: "image/png,image/jpeg,image/webp,image/*;q=0.8" });
    const kind = sniffImage(doc.body);
    if (!kind) return null;
    const mediaType = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" }[kind];
    return { url: doc.url, data: doc.body, mediaType };
  } catch { return null; }
}

async function fetchCss(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const doc = await safeFetch(url, { maxBytes: CSS_MAX, timeoutMs, truncate: true, accept: "text/css,*/*;q=0.1" });
    return decodeText(doc);
  } catch { return null; }
}

function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const local = digits.startsWith("+61") ? `0${digits.slice(3).replace(/^0/, "")}` : digits.startsWith("61") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
  if (/^0[2378]\d{8}$/.test(local)) return `(${local.slice(0, 2)}) ${local.slice(2, 6)} ${local.slice(6)}`;
  if (/^04\d{8}$/.test(local)) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  if (/^1[38]00\d{6}$/.test(local)) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  if (/^13\d{4}$/.test(local)) return `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4)}`;
  return raw.trim();
}

function hoursFromAi(h: NonNullable<AiOutput["hours"]>): { hours: ImportedHours; check: string } | null {
  if (!h.days.length) return null;
  const sessions: Partial<Record<DayKey, Session[]>> = {};
  const stated = new Set<DayKey>();
  const late: string[] = [];
  for (const d of h.days) {
    const day = d.day as DayKey;
    stated.add(day);
    if (d.closed) continue;
    for (const s of d.sessions) {
      const open = toHHMM(s.open) ?? s.open;
      let close = s.close ? toHHMM(s.close) ?? s.close : null;
      if (!close) { close = "23:00"; late.push(day); }
      (sessions[day] ??= []).push({ open, close, ...(s.label ? { label: s.label } : {}) });
    }
  }
  const week = weekFromSessions(sessions, stated);
  const notStated = DAY_KEYS.filter(d => !stated.has(d));
  for (const d of notStated) week[d] = { ...week[d], closed: true };
  const split = DAY_KEYS.filter(d => (sessions[d]?.length ?? 0) > 1);

  const notes = ["Check the hours with the owner, including public holidays."];
  if (split.length) notes.push(`Split sessions on ${days(split)} (e.g. lunch and dinner). The system keeps one open and close time per day, so the gap in between isn't shown.`);
  if (late.length) notes.push(`The site says "late" on ${days(uniq(late) as DayKey[])}. We put 23:00, so ask for the real closing time.`);
  if (notStated.length) notes.push(`The site doesn't mention ${days(notStated)}, so we set ${notStated.length > 1 ? "them" : "it"} to closed.`);
  if (h.notes) notes.push(`Site note: ${h.notes}`);
  return { hours: { week, sessions, notes: h.notes }, check: notes.join(" ") };
}

function uniq<T>(xs: T[]): T[] { return [...new Set(xs)]; }

const DAY_LABEL: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const days = (ds: DayKey[]) => ds.map(d => DAY_LABEL[d]).join(", ");

function menuFromAi(ai: AiOutput): ImportedMenuCategory[] {
  return ai.menu.map(c => ({
    name: c.category,
    items: c.items.map(i => {
      const notes: string[] = [];
      let price = i.price;
      if (price === null && i.variants.length) {
        price = Math.min(...i.variants.map(v => v.price));
        notes.push("Price set to the cheapest size.");
      }
      if (price === null) notes.push("No price on the site.");
      if (i.note) notes.push(i.note);
      if (i.dietary.length) notes.push("Confirm the dietary tags with the owner.");
      return {
        name:         i.name,
        price,
        description:  i.description,
        dietary_tags: i.dietary,
        variants:     i.variants,
        check:        notes.length ? notes.join(" ") : null,
      };
    }),
  }));
}

export async function runImport(inputUrl: string, opts: { deadlineMs: number }): Promise<ImportResult> {
  const started = Date.now();
  const left = () => opts.deadlineMs - (Date.now() - started);
  const url = normaliseUrl(inputUrl);
  if (NOT_OWN_SITE.test(url.hostname)) {
    throw new ImportFetchError("That's not the restaurant's own website. Paste the link to their own site (Google, social media and delivery app pages can't be imported).");
  }

  // ── 1. Home page ──────────────────────────────────────────────────────────
  const homeDoc = await safeFetch(url, { maxBytes: HTML_MAX, timeoutMs: 15_000, truncate: true });
  if (homeDoc.contentType && !/html|xml/.test(homeDoc.contentType)) {
    throw new ImportFetchError("That link isn't a web page. Paste the restaurant's home page.");
  }
  const home = parsePage(decodeText(homeDoc), homeDoc.url);
  const warnings: string[] = [];
  const pagesRead: ImportResult["pages_read"] = [{ url: home.url, kind: "home", chars: home.text.length }];
  if (looksJsRendered(home.html, home.text)) {
    warnings.push("Their home page has very little text on it, so some details may be missing. If it's a \"choose your location\" page, paste the link to the venue's own page instead.");
  }

  // ── 2. Follow-up fetches, in parallel ─────────────────────────────────────
  const menuLinks = menuCandidates(home);
  const menuPageUrls = menuLinks.filter(c => !c.pdf && c.score >= 2).slice(0, 2).map(c => c.url);
  const hoursLd = hoursFromJsonLd(home.biz);
  const addrHome = findAddresses(home);
  const contactUrl = (!hoursLd || !addrHome.values.length) ? contactCandidate(home) : null;
  const followTimeout = Math.min(12_000, Math.max(3_000, left() - 200_000));

  const [menuPages, contactPage, cssTexts] = await Promise.all([
    Promise.all(menuPageUrls.map(u => fetchPage(u, followTimeout))),
    contactUrl && !menuPageUrls.includes(contactUrl) ? fetchPage(contactUrl, followTimeout) : Promise.resolve(null),
    Promise.all(stylesheetLinks(home).map(u => fetchCss(u, followTimeout))),
  ]);
  const okMenuPages = menuPages.filter((p): p is ParsedPage => Boolean(p));
  for (const p of okMenuPages) pagesRead.push({ url: p.url, kind: "menu", chars: p.text.length });
  if (contactPage) pagesRead.push({ url: contactPage.url, kind: "contact", chars: contactPage.text.length });

  // Menu PDFs: linked from the home page, menu links that are PDFs, and any PDF on a menu page.
  const pdfUrls = uniq([
    ...menuLinks.filter(c => c.pdf).map(c => c.url),
    ...pdfLinks(home, true),
    ...okMenuPages.flatMap(p => pdfLinks(p, false)),
  ]).slice(0, 2);
  const imgUrls = uniq([...okMenuPages.flatMap(menuImages), ...menuImages(home)]).slice(0, 3);
  const [pdfs, images] = await Promise.all([
    Promise.all(pdfUrls.map(u => fetchPdf(u, Math.max(followTimeout, 15_000)))),
    Promise.all(imgUrls.map(u => fetchImage(u, followTimeout))),
  ]);
  const okPdfs = pdfs.filter((p): p is { url: string; data: Buffer } => Boolean(p));
  const okImages = images.filter((p): p is { url: string; data: Buffer; mediaType: string } => Boolean(p));
  for (const p of okPdfs) pagesRead.push({ url: p.url, kind: "pdf", chars: p.data.length });
  for (const p of okImages) pagesRead.push({ url: p.url, kind: "image", chars: p.data.length });

  // ── 3. Pattern results ────────────────────────────────────────────────────
  const name = guessName(home);
  const phones = findPhones(home);
  if (!phones.values.length && contactPage) Object.assign(phones, findPhones(contactPage));
  const emails = findEmails(home);
  if (!emails.values.length && contactPage) Object.assign(emails, findEmails(contactPage));
  const addr = addrHome.values.length || !contactPage ? addrHome : findAddresses(contactPage);
  const allText = [home, ...okMenuPages, ...(contactPage ? [contactPage] : [])];
  const hourHints = uniq(allText.flatMap(p => hoursLines(p.text))).slice(0, 20);
  const links = findLinks(home);
  const logos = logoCandidates(home);
  const colours = pickColours(home, cssTexts.filter((t): t is string => Boolean(t)));
  const photos = findPhotos(home, new Set(logos.map(l => l.url)));
  for (const p of okMenuPages) for (const ph of findPhotos(p, new Set(logos.map(l => l.url)))) if (!photos.some(x => x.url === ph.url)) photos.push(ph);

  // ── 4. AI read ────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let ai: AiOutput | null = null;
  const aiInfo: ImportResult["ai"] = { used: false };
  if (!apiKey) {
    aiInfo.error = "ANTHROPIC_API_KEY isn't set, so only the pattern scan ran.";
    warnings.push("The AI read is switched off on this server, so menu, hours and about text are rough and need more checking.");
  } else {
    let budget = TOTAL_CHARS;
    const pages = allText.map(p => {
      const text = p.text.slice(0, Math.min(PAGE_CHARS, Math.max(0, budget)));
      budget -= text.length;
      return { url: p.url, kind: p === home ? "home" : p === contactPage ? "contact" : "menu", text };
    }).filter(p => p.text);
    try {
      const res = await aiExtract({
        url:    home.url,
        pages,
        pdfs:   okPdfs,
        images: okImages,
        hints: {
          structured_data: home.biz ? { name: home.biz.name, address: home.biz.address, telephone: home.biz.telephone, openingHours: home.biz.openingHours, openingHoursSpecification: home.biz.openingHoursSpecification, servesCuisine: home.biz.servesCuisine } : null,
          phones: phones.values, emails: emails.values, address_candidates: addr.values, hours_lines: hourHints,
        },
      }, { apiKey, timeoutMs: Math.max(20_000, left() - 5_000) });
      ai = res.output;
      aiInfo.used = true;
      aiInfo.model = IMPORT_MODEL;
      aiInfo.input_tokens = res.usage.input_tokens;
      aiInfo.output_tokens = res.usage.output_tokens;
      if (res.stopReason === "max_tokens") warnings.push("The menu was too long to read in one go, so the end of it may be missing.");
    } catch (err) {
      aiInfo.error = err instanceof Error ? err.message : "AI read failed";
      warnings.push("The AI read didn't work this time, so only the pattern scan ran. Menu, hours and about text need more checking.");
    }
  }

  // ── 5. Merge ──────────────────────────────────────────────────────────────
  const mainLoc = ai?.locations[0] ?? null;
  if (ai && ai.locations.length > 1) {
    warnings.push(`Their site lists ${ai.locations.length} venues (${ai.locations.map(l => l.suburb ?? l.name ?? l.address).join(", ")}). This import uses the first one. Ask which venue this store is for, and set up the others as their own stores.`);
  } else if (!ai && addr.multiple) {
    warnings.push("Their site may list more than one venue. Check which address this store is for.");
  }
  if (ai?.ordering_apps_mentioned.length) warnings.push(`Their site mentions ${ai.ordering_apps_mentioned.join(", ")}.`);
  for (const note of ai?.staff_should_check ?? []) warnings.push(note);

  const aiName = ai?.name.value ?? null;
  const nameValue = name.source === "JSON-LD" || name.source === "og:site_name" ? name.value : aiName ?? name.value;
  const nameDiffers = aiName && name.value && aiName.toLowerCase().replace(/\W/g, "") !== name.value.toLowerCase().replace(/\W/g, "");

  const phoneRaw = phones.values[0] ?? mainLoc?.phone ?? ai?.phone.value ?? null;
  const addressValue = mainLoc?.address ?? addr.values[0] ?? null;
  const addressFromLd = addr.source === "JSON-LD" && !mainLoc;

  // Hours: the AI read of the page text is usually more complete than JSON-LD,
  // which is often a generic template. Fall back to JSON-LD when there's no AI.
  let hoursField: ImportField<ImportedHours>;
  const aiHours = ai?.hours ? hoursFromAi(ai.hours) : null;
  if (aiHours) {
    hoursField = field(aiHours.hours, "their site (AI read)", "medium", aiHours.check, ai?.hours?.quote);
  } else if (hoursLd) {
    hoursField = field(hoursLd, "structured data on their site", "medium", "Check the hours with the owner, including public holidays. Structured data is sometimes an old template.");
  } else {
    hoursField = field<ImportedHours>(null, null, "none", hourHints.length
      ? `Couldn't read the hours. Lines that look like hours: ${hourHints.slice(0, 6).join(" · ")}`
      : "No hours found on their site. Ask the owner.");
  }

  let menu: ImportField<ImportedMenuCategory[]>;
  if (ai?.menu.length) {
    const count = ai.menu.reduce((n, c) => n + c.items.length, 0);
    menu = field(menuFromAi(ai), `their site (AI read of ${okPdfs.length ? "menu PDFs and " : ""}pages)`, "medium",
      `${count} items found. Check every price with the owner. Website and PDF prices are often out of date or different in store.${ai.menu_truncated ? " The menu was cut short, so some items are missing." : ""}`);
  } else {
    const items = uniq([...okMenuPages, home]).flatMap(p => menuItemsByPattern(p.text)).slice(0, 150);
    menu = items.length
      ? field([{ name: "Menu", items }], "pattern scan of their pages", "low",
          "Found by pattern matching only, so names, prices and sections need checking.")
      : field<ImportedMenuCategory[]>(null, null, "none", okPdfs.length || okImages.length
          ? "Their menu is a PDF or image that couldn't be read. Type it in or ask the owner for it."
          : "No menu found on their site.");
  }

  const topLogo = logos[0] ?? null;
  const logoIsSvg = topLogo ? /\.svg(\?|$)/i.test(topLogo.url) : false;

  return {
    source_url: inputUrl.trim(),
    final_url:  home.url,
    fetched_at: new Date().toISOString(),
    platform:   detectPlatform(home.html, home.meta),
    pages_read: pagesRead,
    ai:         aiInfo,
    warnings:   uniq(warnings),

    name: field(nameValue, name.source === "JSON-LD" ? "structured data" : name.source ?? "their site (AI read)", name.source === "JSON-LD" || name.source === "og:site_name" ? "high" : "medium",
      nameDiffers ? `The site spells the name two ways: "${name.value}" and "${aiName}". Check the spelling with the owner.` : null,
      nameValue === aiName ? ai?.name.quote : null),
    type:        field(ai?.business_type ?? null, "their site (AI read)", "medium", ai?.business_type ? "Picked from their site. Check it's right." : null),
    cuisine:     field(ai?.cuisine ?? (typeof home.biz?.servesCuisine === "string" ? home.biz.servesCuisine : null), ai?.cuisine ? "their site (AI read)" : "structured data", "medium"),
    tagline:     field(ai?.tagline ?? null, "their site (AI read)", "medium"),
    description: ai?.about
      ? field(ai.about, "written by AI from their site", "medium", "Written by AI from their site. Read it to the owner before it goes live.")
      : field(home.meta.description ?? home.meta["og:description"] ?? null, "their site's search description", "low", "Taken from their site's search description. Check it reads well."),
    phone: field(formatPhone(phoneRaw), phones.values.length ? phones.source : "their site (AI read)", phones.source === "phone links" || phones.source === "JSON-LD" ? "high" : "medium",
      phones.values.length > 1 ? `Their site lists more than one number: ${phones.values.slice(0, 4).map(formatPhone).join(", ")}. Check which one is for this store.` : null,
      ai?.phone.quote),
    email: field(emails.values[0] ?? ai?.email.value ?? null, emails.values.length ? emails.source : "their site (AI read)", emails.values.length ? "high" : "medium",
      emails.values.length > 1 ? `More than one email on their site: ${emails.values.slice(0, 3).join(", ")}.` : null),
    address: field(addressValue, mainLoc ? "their site (AI read)" : addr.source, addressFromLd ? "high" : "medium",
      addressFromLd && !addr.multiple ? null : "Check this is the venue's address, not parking, a head office or another shop.", mainLoc?.quote),
    suburb: field(mainLoc?.suburb ?? suburbFrom(home, addressValue), mainLoc?.suburb ? "their site (AI read)" : "from the address", "medium"),
    locations: field(ai?.locations.length ? ai.locations.map(l => ({ name: l.name, address: l.address, suburb: l.suburb, postcode: l.postcode, phone: formatPhone(l.phone) })) : null,
      "their site (AI read)", "medium", ai && ai.locations.length > 1 ? "More than one venue. This import is for the first." : null),
    hours: hoursField,
    logo: field(topLogo?.url ?? null, topLogo?.why ?? null, topLogo && topLogo.score >= 3 ? "medium" : "low",
      !topLogo ? "No logo found. Ask the owner for a PNG or JPG."
        : logoIsSvg ? "Their logo is an SVG file, which we can't use. Ask the owner for a PNG or JPG."
        : "Make sure this is their logo and that they're happy for us to use it."),
    logo_candidates: logos.map(l => l.url).filter(u => !/\.svg(\?|$)/i.test(u)),
    colours: colours
      ? field({ suggested: colours.suggested, swatches: colours.swatches }, colours.source, "medium", "Pick the colour that matches their brand. Website theme defaults are filtered out but can still slip through.")
      : field<{ suggested: string; swatches: string[] }>(null, null, "none", "No brand colour found. Pick one with the owner."),
    menu,
    surcharges: field(ai?.surcharges.length ? ai.surcharges : null, "their site (AI read)", "medium", ai?.surcharges.length ? "Kept out of the menu. Set these up as fees if the owner wants them." : null),
    social:         links.social,
    ordering_links: links.ordering.filter(l => !sameSite(l.url, home.url) || l.name === "Online ordering"),
    booking_link:   links.booking,
    photos: field(photos.length ? photos.slice(0, 16) : null, "images on their site", "low", photos.length ? "Only use photos the owner took or has the rights to. Some sites use stock or platform photos." : null),
  };
}

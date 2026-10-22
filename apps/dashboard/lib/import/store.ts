// ─── Website import: what gets saved ────────────────────────────────────────
// The wizard sends back the import draft when it creates the business. It comes
// from the browser, so every field is re-checked and size-capped here before it
// goes onto businesses.settings.import.

import {
  DAY_KEYS, DIETARY_TAGS, type DayHours, type DayKey, type ImportedHours, type ImportedMenuCategory,
  type ImportResult, type Session, type StoredImport,
} from "./types";

const str = (v: unknown, max = 500): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});
const httpUrl = (v: unknown): string | null => {
  const s = str(v, 2000);
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null; } catch { return null; }
};
const hhmm = (v: unknown): string | null => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
const hex = (v: unknown): string | null => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);
const price = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 10000 ? Math.round(v * 100) / 100 : null);

function cleanHours(v: unknown): ImportedHours | null {
  const h = obj(v);
  const week = obj(h.week);
  if (!Object.keys(week).length) return null;
  const outWeek = {} as Record<DayKey, DayHours>;
  const sessions: Partial<Record<DayKey, Session[]>> = {};
  for (const d of DAY_KEYS) {
    const w = obj(week[d]);
    outWeek[d] = { open: hhmm(w.open) ?? "09:00", close: hhmm(w.close) ?? "21:00", closed: w.closed === true };
    const list = arr(obj(h.sessions)[d]).slice(0, 4).map(s => {
      const so = obj(s);
      const open = hhmm(so.open), close = hhmm(so.close);
      return open && close ? { open, close, ...(str(so.label, 40) ? { label: str(so.label, 40)! } : {}) } : null;
    }).filter((s): s is Session => Boolean(s));
    if (list.length) sessions[d] = list;
  }
  return { week: outWeek, sessions, notes: str(h.notes, 400) };
}

function cleanMenu(v: unknown): ImportedMenuCategory[] | null {
  const tags = new Set<string>(DIETARY_TAGS);
  let budget = 300;
  const cats = arr(v).slice(0, 40).map(c => {
    const co = obj(c);
    const items = arr(co.items).slice(0, Math.max(0, budget)).map(i => {
      const io = obj(i);
      const name = str(io.name, 120);
      if (!name) return null;
      return {
        name,
        price:        price(io.price),
        description:  str(io.description, 500),
        dietary_tags: arr(io.dietary_tags).map(String).filter(t => tags.has(t)),
        variants:     arr(io.variants).slice(0, 8).map(x => ({ name: str(obj(x).name, 60) ?? "", price: price(obj(x).price) ?? 0 })).filter(x => x.name && x.price > 0),
        check:        str(io.check, 300),
      };
    }).filter((i): i is NonNullable<typeof i> => Boolean(i));
    budget -= items.length;
    return { name: str(co.name, 80) ?? "Menu", items };
  }).filter(c => c.items.length);
  return cats.length ? cats : null;
}

export function toStoredImport(raw: unknown, userId: string): StoredImport | null {
  const r = obj(raw) as Partial<Record<keyof ImportResult, unknown>>;
  const sourceUrl = httpUrl(r.source_url) ?? httpUrl(r.final_url);
  if (!sourceUrl) return null;

  const checks: Record<string, string> = {};
  for (const key of ["name", "type", "description", "phone", "email", "address", "suburb", "hours", "logo", "colours", "menu", "surcharges", "photos", "locations"] as const) {
    const note = str(obj(r[key]).check, 600);
    if (note) checks[key] = note;
  }

  const colours = obj(obj(r.colours).value);
  const swatches = arr(colours.swatches).map(hex).filter((c): c is string => Boolean(c)).slice(0, 6);
  const social = obj(r.social);

  return {
    source_url:  sourceUrl,
    final_url:   httpUrl(r.final_url) ?? sourceUrl,
    fetched_at:  str(r.fetched_at, 40) ?? new Date().toISOString(),
    permission:  { confirmed: true, confirmed_by: userId, confirmed_at: new Date().toISOString() },
    ai_used:     obj(r.ai).used === true,
    warnings:    arr(r.warnings).map(w => str(w, 600)).filter((w): w is string => Boolean(w)).slice(0, 15),
    checks,
    hours:       cleanHours(obj(r.hours).value),
    logo_candidates: [httpUrl(obj(r.logo).value), ...arr(r.logo_candidates).map(httpUrl)]
      .filter((u): u is string => Boolean(u) && !/\.svg(\?|$)/i.test(u!))
      .filter((u, i, a) => a.indexOf(u) === i).slice(0, 6),
    colours:     swatches.length ? { suggested: hex(colours.suggested) ?? swatches[0]!, swatches } : null,
    menu:        cleanMenu(obj(r.menu).value),
    menu_seeded_at: null,
    locations:   arr(obj(r.locations).value).slice(0, 10).map(l => {
      const lo = obj(l);
      const address = str(lo.address, 300);
      return address ? { name: str(lo.name, 120), address, suburb: str(lo.suburb, 80), postcode: str(lo.postcode, 10), phone: str(lo.phone, 40) } : null;
    }).filter((l): l is NonNullable<typeof l> => Boolean(l)),
    surcharges:  arr(obj(r.surcharges).value).map(s => str(s, 200)).filter((s): s is string => Boolean(s)).slice(0, 12),
    social: {
      ...(httpUrl(social.facebook)  ? { facebook:  httpUrl(social.facebook)! }  : {}),
      ...(httpUrl(social.instagram) ? { instagram: httpUrl(social.instagram)! } : {}),
      ...(httpUrl(social.tiktok)    ? { tiktok:    httpUrl(social.tiktok)! }    : {}),
    },
    ordering_links: arr(r.ordering_links).slice(0, 10).map(l => ({ name: str(obj(l).name, 60) ?? "Ordering", url: httpUrl(obj(l).url) ?? "" })).filter(l => l.url),
    booking_link:   httpUrl(r.booking_link),
    photos:      arr(obj(r.photos).value).slice(0, 16).map(p => ({ url: httpUrl(obj(p).url) ?? "", alt: str(obj(p).alt, 200) })).filter(p => p.url),
    tagline:     str(obj(r.tagline).value, 200),
    cuisine:     str(obj(r.cuisine).value, 80),
  };
}

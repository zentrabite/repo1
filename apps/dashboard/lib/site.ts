// ─── Restaurant website data ────────────────────────────────────────────────
// Builds everything the website template needs from the business row, its
// menu and settings. Server-side only (uses the service-role client).
//
// Site settings live on businesses.settings.site:
//   published     boolean   shown to the public at name.zentrabite.com
//   look          "bold" | "warm" | "clean"
//   tagline, about           override the imported or entered text
//   photos        string[]  photos the owner has said we can use (first = hero)
//   offer_text    string    optional banner, e.g. "$10 off your first order"
//   show_rewards  boolean   rewards band (only shown if rewards exist)

import { createAdminClient } from "@/lib/supabase-server";
import { DAY_KEYS, type DayKey, type ImportedHours } from "@/lib/import/types";

export type SiteLook = "bold" | "warm" | "clean";

export type SiteSettings = {
  published?:    boolean;
  published_at?: string;
  look?:         SiteLook;
  tagline?:      string;
  about?:        string;
  photos?:       string[];
  offer_text?:   string;
  show_rewards?: boolean;
};

export type SitePhoto = { url: string; alt: string; stock: boolean };

export type SiteData = {
  id:          string;
  subdomain:   string;
  name:        string;
  kicker:      string;          // "Pizzeria · Norwood"
  tagline:     string | null;
  about:       string | null;
  look:        SiteLook;
  accent:      string;
  accentText:  string;
  logoUrl:     string | null;
  phone:       string | null;
  address:     string | null;
  mapsUrl:     string | null;
  hours:       { label: string; value: string }[];
  openNow:     string | null;   // "Open now until 9pm" / "Opens 5pm"
  photos:      SitePhoto[];
  menu:        { id: string; name: string; price: number; description: string | null }[];
  hasMenu:     boolean;
  takingOrders: boolean;
  rewards:     { rate: number } | null;
  offerText:   string | null;
  social:      { label: string; url: string }[];
  bookingUrl:  string | null;
  published:   boolean;
};

// ─── Stock photos ───────────────────────────────────────────────────────────
// Unsplash licence (free for commercial use). Used until the owner gives us
// their own photos. Each set is hero, story, then gallery.
const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=75`;
const STOCK: Record<string, [string, string][]> = {
  pizza:  [["1513104890138-7c749659a591", "Wood-fired pizza on a board"], ["1517248135467-4c7edcad34c4", "Dining room"], ["1574071318508-1cdbab80d002", "Margherita pizza"], ["1565299624946-b28f40a0ae38", "Pizza slices"]],
  asian:  [["1455619452474-d2be8b1e70cd", "Curry and rice"], ["1562565652-a0d8f0c59eb4", "Dishes on the table"], ["1548943487-a2e4e43b4853", "Bowl of soup"], ["1512058564366-18510be2db19", "Fried rice in a pan"]],
  cafe:   [["1495474472287-4d71bcdd2085", "Two flat whites"], ["1501339847302-ac426a4a7cbb", "The counter"], ["1509042239860-f550ce710b93", "Coffee cups"], ["1511920170033-f8396924c348", "Coffee beans"]],
  burger: [["1568901346375-23c9450c58cd", "Cheeseburger"], ["1555396273-367ea4eb4db5", "Dining room"], ["1571091718767-18b5b1457add", "Burger with fries"], ["1550547660-d9450f859349", "Two burgers"]],
  // Generic dining room shots when the food doesn't match a set
  dining: [["1517248135467-4c7edcad34c4", "Dining room"], ["1555396273-367ea4eb4db5", "Dining room"]],
};

function stockSet(text: string): keyof typeof STOCK {
  const t = text.toLowerCase();
  if (/pizz/.test(t)) return "pizza";
  if (/burger/.test(t)) return "burger";
  if (/caf[eé]|coffee|bagel|bakery|brunch|espresso/.test(t)) return "cafe";
  if (/thai|asian|noodle|ramen|pho|vietnam|chinese|dumpling|malay|laksa|curry/.test(t)) return "asian";
  return "dining";
}

// ─── Small helpers ──────────────────────────────────────────────────────────

const str = (v: unknown, max = 2000): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#FFFFFF";
}

/** "17:00" → "5pm", "17:30" → "5:30pm", "23:59" → "midnight" */
export function prettyTime(t: string): string {
  if (t === "23:59" || t === "00:00") return "midnight";
  const [hs, ms] = t.split(":");
  const h = Number(hs), m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  if (h === 12 && m === 0) return "midday";
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

const DAY_SHORT: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

type Week = Partial<Record<DayKey, { open?: string; close?: string; closed?: boolean }>>;

/** One line per run of days with the same hours, e.g. "Mon to Thu" · "5pm to 9pm". */
export function hoursLines(week: Week | null, imported: ImportedHours | null): { label: string; value: string }[] {
  if (!week || !Object.keys(week).length) return [];
  const valueFor = (d: DayKey): string => {
    const w = week[d];
    if (!w || w.closed || !w.open || !w.close) return "Closed";
    // Use the imported split sessions while the day still matches the import
    const iw = imported?.week?.[d];
    const sessions = imported?.sessions?.[d];
    if (iw && sessions && sessions.length > 1 && iw.open === w.open && iw.close === w.close && !iw.closed) {
      return sessions.map(s => `${prettyTime(s.open)} to ${prettyTime(s.close)}`).join(", ");
    }
    return `${prettyTime(w.open)} to ${prettyTime(w.close)}`;
  };
  const out: { label: string; value: string }[] = [];
  let start = 0;
  for (let i = 1; i <= DAY_KEYS.length; i++) {
    if (i === DAY_KEYS.length || valueFor(DAY_KEYS[i]!) !== valueFor(DAY_KEYS[start]!)) {
      const a = DAY_SHORT[DAY_KEYS[start]!], b = DAY_SHORT[DAY_KEYS[i - 1]!];
      out.push({ label: start === i - 1 ? a : i - start === 7 ? "Every day" : `${a} to ${b}`, value: valueFor(DAY_KEYS[start]!) });
      start = i;
    }
  }
  return out;
}

/** "Open now until 9pm", "Opens 5pm", or null if hours aren't known. */
export function openNow(week: Week | null, timezone: string, now = new Date()): string | null {
  if (!week || !Object.keys(week).length) return null;
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map(p => [p.type, p.value]));
  } catch { return null; }
  const day = (parts.weekday ?? "").slice(0, 3).toLowerCase() as DayKey;
  const nowHM = `${parts.hour}:${parts.minute}`;
  const today = week[day];
  if (today && !today.closed && today.open && today.close) {
    if (nowHM >= today.open && nowHM < today.close) return `Open now until ${prettyTime(today.close)}`;
    if (nowHM < today.open) return `Opens ${prettyTime(today.open)} today`;
  }
  const idx = DAY_KEYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = DAY_KEYS[(idx + i) % 7]!;
    const w = week[d];
    if (w && !w.closed && w.open) return `Opens ${i === 1 ? "tomorrow" : DAY_SHORT[d]} ${prettyTime(w.open)}`;
  }
  return null;
}

const TYPE_LABEL: Record<string, string> = {
  restaurant: "Restaurant", cafe: "Café", bar: "Bar", bakery: "Bakery", food_truck: "Food truck",
  retail: "Shop", salon: "Salon", gym: "Gym", service: "Services", other: "",
};

// ─── Loader ─────────────────────────────────────────────────────────────────

export type SiteRow = {
  id: string; name: string; type: string | null; suburb: string | null; subdomain: string;
  logo_url: string | null; description: string | null; contact_phone: string | null; address: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any> | null; stripe_account_id: string | null; stripe_charges_enabled: boolean | null;
};
export type SiteCategory = { id: string; name: string; sort_order: number | null };
export type SiteItem = { id: string; name: string; price: number | string; description: string | null; category_id: string | null; sort_order: number | null };

export async function loadSite(subdomain: string): Promise<SiteData | null> {
  if (!/^[a-z0-9-]{1,63}$/.test(subdomain)) return null;
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: biz } = await (db.from("businesses") as any)
    .select("id, name, type, suburb, subdomain, logo_url, description, contact_phone, address, settings, stripe_account_id, stripe_charges_enabled")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (!biz) return null;

  const [catsRes, itemsRes, rewardsRes] = await Promise.all([
    db.from("menu_categories").select("id, name, sort_order").eq("business_id", biz.id).order("sort_order"),
    db.from("menu_items").select("id, name, price, description, category_id, sort_order").eq("business_id", biz.id).eq("available", true).order("sort_order").limit(400),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from("rewards_catalogue") as any).select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("is_active", true),
  ]);
  return buildSite(biz as SiteRow, (catsRes.data ?? []) as SiteCategory[], (itemsRes.data ?? []) as SiteItem[], rewardsRes.count ?? 0);
}

/** Pure: turns the business row and menu into what the template shows. */
export function buildSite(biz: SiteRow, cats: SiteCategory[], allItems: SiteItem[], rewardsCount: number): SiteData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (biz.settings ?? {}) as Record<string, any>;
  const site = (settings.site ?? {}) as SiteSettings;
  const imp = settings.import && typeof settings.import === "object" ? settings.import : null;

  // A few dishes from across the menu: walk the categories in order and take
  // one at a time from each, so the list isn't six sides from one section.
  const items = allItems.filter(i => Number(i.price) > 0);
  const byCat = cats.map(c => items.filter(i => i.category_id === c.id));
  byCat.push(items.filter(i => !cats.some(c => c.id === i.category_id)));
  const picks: typeof items = [];
  for (let round = 0; picks.length < 6 && round < 6; round++) {
    for (const list of byCat) {
      const it = list[round];
      if (it && picks.length < 6) picks.push(it);
    }
  }

  const cuisine = str(imp?.cuisine, 60);
  const typeLabel = TYPE_LABEL[biz.type ?? ""] ?? "";
  const kicker = [cuisine ?? typeLabel, str(biz.suburb, 60)].filter(Boolean).join(" · ");

  const accentRaw = str(settings.branding?.accent_color, 7);
  const accent = accentRaw && /^#[0-9a-f]{6}$/i.test(accentRaw) ? accentRaw : "#00B67A";

  const ownPhotos = (Array.isArray(site.photos) ? site.photos : [])
    .filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u)).slice(0, 8)
    .map(url => ({ url, alt: `${biz.name}`, stock: false }));
  const set = STOCK[stockSet([cuisine, biz.name, biz.type ?? "", ...picks.map(p => p.name)].join(" "))]!;
  const photos: SitePhoto[] = ownPhotos.length ? ownPhotos : set.map(([id, alt]) => ({ url: UNSPLASH(id), alt, stock: true }));

  const address = str(biz.address, 300);
  const social = (["instagram", "facebook", "tiktok"] as const)
    .map(k => ({ label: k === "tiktok" ? "TikTok" : k[0]!.toUpperCase() + k.slice(1), url: str(settings.social?.[k], 500) ?? str(imp?.social?.[k], 500) }))
    .filter((s): s is { label: string; url: string } => Boolean(s.url && /^https?:\/\//.test(s.url)));
  const booking = str(imp?.booking_link, 500);

  return {
    id:          biz.id,
    subdomain:   biz.subdomain,
    name:        biz.name,
    kicker,
    tagline:     str(site.tagline, 200) ?? str(imp?.tagline, 200),
    about:       str(site.about, 1200) ?? str(biz.description, 1200),
    look:        site.look === "warm" || site.look === "clean" ? site.look : "bold",
    accent,
    accentText:  textOn(accent),
    logoUrl:     str(biz.logo_url, 1000),
    phone:       str(biz.contact_phone, 40) ?? str(settings.phone, 40),
    address,
    mapsUrl:     address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name} ${address}`)}` : null,
    hours:       hoursLines(settings.hours ?? null, imp?.hours ?? null),
    openNow:     openNow(settings.hours ?? null, str(settings.timezone, 60) ?? "Australia/Adelaide"),
    photos,
    menu:        picks.map(p => ({ id: p.id, name: p.name, price: Number(p.price), description: str(p.description, 200) })),
    hasMenu:     items.length > 0,
    takingOrders: Boolean(biz.stripe_account_id && biz.stripe_charges_enabled),
    // 10 points per $1 is set by the database trigger on orders (migration 005)
    rewards:     site.show_rewards !== false && rewardsCount > 0 ? { rate: 10 } : null,
    offerText:   str(site.offer_text, 160),
    social,
    bookingUrl:  booking && /^https?:\/\//.test(booking) ? booking : null,
    published:   site.published === true,
  };
}

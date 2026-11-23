// ─── Restaurant website data ────────────────────────────────────────────────
// Builds everything the website template needs from the business row, its
// menu and settings. Server-side only (uses the service-role client).
//
// Site settings live on businesses.settings.site:
//   published     boolean   shown to the public at name.zentrabite.com
//   look          "bold" | "warm" | "clean"
//   tagline, about           override the imported or entered text
//   photos        string[]  photos the owner has said we can use (first = hero)
//   photo_copies  object    our copy of each of them (lib/site-photos.ts)
//   offer_text    string    optional banner, e.g. "$10 off your first order"
//   show_rewards  boolean   rewards band (only shown if rewards exist)

import { createAdminClient } from "@/lib/supabase-server";
import { DAY_KEYS, type DayKey, type ImportedHours } from "@/lib/import/types";
import { cheapestPrice, pricesVary, readOptions } from "@/lib/menu-options";
import { offerText, readFirstOrderOffer } from "@/lib/first-order";

export type SiteLook = "bold" | "warm" | "clean";

export type SiteSettings = {
  published?:    boolean;
  published_at?: string;
  look?:         SiteLook;
  tagline?:      string;
  about?:        string;
  photos?:       string[];
  photo_copies?: Record<string, string>;   // our copies of photos (lib/site-photos.ts)
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
  // from: the item has sizes or extras that cost more, so the price is "From $X".
  menu:        { id: string; name: string; price: number; from: boolean; description: string | null }[];
  hasMenu:     boolean;
  takingOrders: boolean;
  rewards:     { rate: number } | null;
  offerText:   string | null;
  social:      { label: string; url: string }[];
  bookingUrl:  string | null;
  published:   boolean;
};

// ─── Stock photos ───────────────────────────────────────────────────────────
// Shown until the owner gives us photos of their own. Copies of Unsplash
// photos kept in public/site-stock, so a site never breaks if a photo leaves
// Unsplash and a visitor's browser never calls Unsplash. The Unsplash License
// (unsplash.com/license) lets us copy and use them commercially with no credit
// needed, but it only covers the photographer's copyright. So the rules for
// this list (checked 23 Nov 2026):
//   • food and ingredients only, no logos, brands or labels you can read
//   • no faces, and no rooms, counters or shopfronts, because a stranger's
//     dining room beside "Our story" would pass as the shop's own
//   • Unsplash License photos only (photo-…, never premium_photo-…, which is
//     Unsplash+)
// The footer says the photos are stock whenever these are used. Before
// 23 Nov the sets had other venues' dining rooms and a photo with Coca-Cola
// bottles in it. Each set is hero, story, then gallery. Each entry is
// [file in public/site-stock, alt text, Unsplash photo id].
const STOCK = {
  pizza: [
    ["pizza-board", "Pizza on a wooden board", "1513104890138-7c749659a591"],
    ["pizza-ingredients", "Tomatoes, garlic and herbs around a wooden board", "1690983322070-22861e13ce47"],
    ["pizza-margherita", "Margherita pizza", "1574071318508-1cdbab80d002"],
    ["pizza-slices", "Pizza slices", "1565299624946-b28f40a0ae38"],
  ],
  asian: [
    ["asian-curry", "Curry in a bowl", "1455619452474-d2be8b1e70cd"],
    ["asian-dishes", "Dishes on a table", "1562565652-a0d8f0c59eb4"],
    ["asian-soup", "Bowl of soup", "1548943487-a2e4e43b4853"],
    ["asian-fried-rice", "Fried rice in a pan", "1512058564366-18510be2db19"],
  ],
  cafe: [
    ["cafe-coffees", "Coffees on a table", "1495474472287-4d71bcdd2085"],
    ["cafe-croissants", "Croissants", "1623334044303-241021148842"],
    ["cafe-cups", "Coffee cups", "1509042239860-f550ce710b93"],
    ["cafe-beans", "Ground coffee and beans", "1511920170033-f8396924c348"],
  ],
  burger: [
    ["burger-cheeseburger", "Cheeseburger", "1568901346375-23c9450c58cd"],
    ["burger-fries-basket", "Fries in a basket", "1630384060421-cb20d0e0649d"],
    ["burger-classic", "Burger with lettuce and tomato", "1571091718767-18b5b1457add"],
    ["burger-fries", "Fries with sauce", "1518013431117-eb1465fa5752"],
  ],
  // Any other food business. Ingredients at the top, because a dish there
  // would say what the shop cooks. Three, so no gallery shows.
  food: [
    ["pizza-ingredients", "Tomatoes, garlic and herbs around a wooden board", "1690983322070-22861e13ce47"],
    ["food-plate", "A plate of food", "1542528180-0c79567c66de"],
    ["food-table", "Shared plates on a table", "1633195000232-ca6e3cbcfd41"],
  ],
} as const satisfies Record<string, readonly (readonly [string, string, string])[]>;

export type StockSet = keyof typeof STOCK;

const FOOD_TYPES = new Set(["restaurant", "cafe", "bar", "bakery", "food_truck"]);
const NOT_FOOD_TYPES = new Set(["retail", "salon", "gym", "service"]);

/** Which stock photos fit a business, or null for none. Shops, salons, gyms and
 *  trades get none, because pictures of food would be wrong for them. */
export function stockSet(type: string | null, text: string, cuisine: string | null): StockSet | null {
  if (NOT_FOOD_TYPES.has(type ?? "")) return null;
  const t = text.toLowerCase();
  if (/pizz/.test(t)) return "pizza";
  if (/burger/.test(t)) return "burger";
  if (/caf[eé]|coffee|bagel|bakery|brunch|espresso/.test(t)) return "cafe";
  if (/thai|asian|noodle|ramen|pho|vietnam|chinese|dumpling|malay|laksa|curry/.test(t)) return "asian";
  return FOOD_TYPES.has(type ?? "") || cuisine ? "food" : null;
}

export function stockPhotos(set: StockSet | null): SitePhoto[] {
  return set ? STOCK[set].map(([file, alt]) => ({ url: `/site-stock/${file}.webp`, alt, stock: true })) : [];
}

// ─── Small helpers ──────────────────────────────────────────────────────────

const str = (v: unknown, max = 2000): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#FFFFFF";
}

/** "17:00" → "5pm", "17:30" → "5:30pm", "12:00" → "12pm", "23:59" → "midnight" */
export function prettyTime(t: string): string {
  if (t === "23:59" || t === "00:00") return "midnight";
  const [hs, ms] = t.split(":");
  const h = Number(hs), m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

const DAY_SHORT: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

type Week = Partial<Record<DayKey, { open?: string; close?: string; closed?: boolean; break_from?: string; break_to?: string }>>;

/** The day's break, when it sits inside a same-day open and close. */
function dayBreak(w: Week[DayKey]): { from: string; to: string } | null {
  if (!w?.open || !w.close || !w.break_from || !w.break_to) return null;
  const pastMidnight = w.close <= w.open;
  const ok = w.open < w.break_from && w.break_from < w.break_to && (pastMidnight || w.break_to < w.close);
  return ok ? { from: w.break_from, to: w.break_to } : null;
}

/** One line per run of days with the same hours, e.g. "Mon to Thu" · "5pm to 9pm". */
export function hoursLines(week: Week | null, imported: ImportedHours | null): { label: string; value: string }[] {
  if (!week || !Object.keys(week).length) return [];
  const valueFor = (d: DayKey): string => {
    const w = week[d];
    if (!w || w.closed || !w.open || !w.close) return "Closed";
    const br = dayBreak(w);
    if (br) return `${prettyTime(w.open)} to ${prettyTime(br.from)}, ${prettyTime(br.to)} to ${prettyTime(w.close)}`;
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
    const br = dayBreak(today);
    if (br && nowHM >= today.open && nowHM < br.from) return `Open now until ${prettyTime(br.from)}`;
    if (br && nowHM >= br.from && nowHM < br.to) return `Opens again ${prettyTime(br.to)} today`;
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
export type SiteItem = { id: string; name: string; price: number | string; description: string | null; category_id: string | null; sort_order: number | null; options?: unknown };

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
    db.from("menu_items").select("id, name, price, description, category_id, sort_order, options").eq("business_id", biz.id).eq("available", true).order("sort_order").limit(400),
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
  const accent = accentRaw && /^#[0-9a-f]{6}$/i.test(accentRaw) ? accentRaw : "#00AD82";

  // Our copy of each ticked photo (lib/site-photos.ts), or the old site's
  // address when it couldn't be copied.
  const copies = site.photo_copies && typeof site.photo_copies === "object" ? site.photo_copies : {};
  const ownPhotos = (Array.isArray(site.photos) ? site.photos : [])
    .filter((u): u is string => typeof u === "string")
    .map(u => (typeof copies[u] === "string" ? copies[u] : u))
    .filter(u => /^https:\/\//.test(u)).slice(0, 8)
    .map(url => ({ url, alt: `${biz.name}`, stock: false }));
  const set = stockSet(biz.type, [cuisine, biz.name, biz.type ?? "", ...picks.map(p => p.name)].join(" "), cuisine);
  const photos: SitePhoto[] = ownPhotos.length ? ownPhotos : stockPhotos(set);

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
    menu:        picks.map(p => {
      const groups = readOptions(p.options);
      return { id: p.id, name: p.name, price: cheapestPrice(Number(p.price), groups), from: pricesVary(groups), description: str(p.description, 200) };
    }),
    hasMenu:     items.length > 0,
    takingOrders: Boolean(biz.stripe_account_id && biz.stripe_charges_enabled),
    // 10 points per $1 is set by the database trigger on orders (migration 005)
    rewards:     site.show_rewards !== false && rewardsCount > 0 ? { rate: 10 } : null,
    // A real first order offer (lib/first-order.ts) wins over the free-text banner.
    offerText:   offerText(readFirstOrderOffer(biz.settings)) ?? str(site.offer_text, 160),
    social,
    bookingUrl:  booking && /^https?:\/\//.test(booking) ? booking : null,
    published:   site.published === true,
  };
}

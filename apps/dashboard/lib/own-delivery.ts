// ─── Delivery by the shop's own drivers ─────────────────────────────────────
// For shops that deliver themselves. Not couriers (Uber Direct and the like
// are the Delivery page, and nothing books them yet). Shared by the ordering
// page, checkout and Settings, so the rules are the same everywhere.
//
// Stored on businesses.settings.ordering.delivery:
//   enabled        true to offer delivery on the ordering page
//   fee            flat fee in dollars, charged as its own line
//   min_order      smallest order (before the fee) for delivery
//   extra_minutes  drive time added to the prep time, 20 by default
//   areas          the suburbs or postcodes delivered to. Required.

export type DeliveryRules = { enabled: boolean; fee: number; minOrder: number; extraMinutes: number; areas: string[] };
export type DeliveryAddress = { line1: string; suburb: string; postcode: string };

export const DEFAULT_DELIVERY_MINUTES = 20;
const MAX_AREAS = 100;

const money = (v: unknown, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : 0;
};

/** "Norwood, 5067\nKent Town" → ["norwood", "5067", "kent town"] */
export function parseAreas(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,;]+/) : [];
  const out: string[] = [];
  for (const a of list) {
    const v = typeof a === "string" ? a.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60) : "";
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= MAX_AREAS) break;
  }
  return out;
}

export function readDeliveryRules(settings: unknown): DeliveryRules {
  const s = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  const ordering = (s.ordering && typeof s.ordering === "object" ? s.ordering : {}) as Record<string, unknown>;
  const d = (ordering.delivery && typeof ordering.delivery === "object" ? ordering.delivery : {}) as Record<string, unknown>;
  const extra = Math.round(Number(d.extra_minutes));
  const areas = parseAreas(d.areas);
  return {
    // No areas means nowhere to deliver, so it stays off.
    enabled: d.enabled === true && areas.length > 0,
    fee: money(d.fee, 200),
    minOrder: money(d.min_order, 1000),
    extraMinutes: Number.isFinite(extra) && extra >= 0 && extra <= 180 ? extra : DEFAULT_DELIVERY_MINUTES,
    areas,
  };
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, n) : "");

export type AddressCheck = { ok: true; address: DeliveryAddress; text: string } | { ok: false; error: string };

/** Checks a delivery address and that the shop delivers there. */
export function checkDeliveryAddress(rules: DeliveryRules, raw: unknown): AddressCheck {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const address = { line1: clip(r.line1, 120), suburb: clip(r.suburb, 60), postcode: clip(r.postcode, 4) };
  if (!address.line1 || !address.suburb) return { ok: false, error: "Please add your street address and suburb." };
  if (!/^\d{4}$/.test(address.postcode)) return { ok: false, error: "Please add a 4-digit postcode." };
  const suburb = address.suburb.toLowerCase();
  if (!rules.areas.includes(suburb) && !rules.areas.includes(address.postcode)) {
    return { ok: false, error: `Sorry, we don't deliver to ${address.suburb} yet. You can still pick it up.` };
  }
  return { ok: true, address, text: `${address.line1}, ${address.suburb} ${address.postcode}` };
}

/** The order note, cleaned. Line breaks become spaces, 300 characters at most. */
export function cleanNote(raw: unknown): string {
  return clip(raw, 300);
}

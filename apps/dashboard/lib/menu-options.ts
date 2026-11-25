// ─── Menu options: sizes, extras and choices on a menu item ─────────────────
// Stored on menu_items.options (migration 018) as a list of groups:
//
//   [{ id, name: "Size", min: 1, max: 1, choices: [
//       { id, name: "Small", price: 0,   available: true },
//       { id, name: "Large", price: 4.5, available: true } ] }]
//
//   • min is how many the customer must pick (0 = optional, 1 = required)
//   • max is the most they can pick (1 = pick one)
//   • a choice's price is added to the item's price (0 = free)
//
// The browser sends only the ids of the choices picked. Checkout checks them
// against the menu and works out the price with priceSelection(), so a
// customer can't change a price or skip a required choice.
//
// Used by the menu editor, the ordering page, the POS, checkout and the
// webhook, so it has no server-only imports.

export type OptionChoice = { id: string; name: string; price: number; available: boolean };
export type OptionGroup  = { id: string; name: string; min: number; max: number; choices: OptionChoice[] };
/** What an order line keeps of each choice, so old orders still read right if the menu changes. */
export type ChosenOption = { group: string; name: string; price: number };

export const MAX_GROUPS        = 10;
export const MAX_CHOICES       = 20;
export const MAX_PICKS_PER_LINE = 30;
const NAME_MAX = 60;
const ID_MAX   = 40;

const cents = (n: number) => Math.round(n * 100);

function cleanName(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, NAME_MAX) : "";
}

function cleanId(v: unknown): string {
  return typeof v === "string" && v.length > 0 && v.length <= ID_MAX ? v : "";
}

function cleanPrice(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : 0;
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return cents(n) / 100;
}

/**
 * Reads options saved on a menu item. Anything malformed is dropped rather
 * than trusted: a choice needs an id and a name, a group needs a name and at
 * least one choice, and a choice id can only be used once on an item.
 */
export function readOptions(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const groups: OptionGroup[] = [];

  for (const g of raw.slice(0, MAX_GROUPS)) {
    if (!g || typeof g !== "object") continue;
    const rec = g as Record<string, unknown>;
    const id = cleanId(rec.id);
    const name = cleanName(rec.name);
    if (!id || !name || seen.has(id)) continue;

    const choices: OptionChoice[] = [];
    for (const c of Array.isArray(rec.choices) ? rec.choices.slice(0, MAX_CHOICES) : []) {
      if (!c || typeof c !== "object") continue;
      const cr = c as Record<string, unknown>;
      const cid = cleanId(cr.id);
      const cname = cleanName(cr.name);
      const price = cleanPrice(cr.price);
      if (!cid || !cname || price === null || seen.has(cid) || cid === id) continue;
      seen.add(cid);
      choices.push({ id: cid, name: cname, price, available: cr.available !== false });
    }
    if (choices.length === 0) continue;
    seen.add(id);

    const maxRaw = Math.floor(Number(rec.max));
    const minRaw = Math.floor(Number(rec.min));
    const max = Math.min(choices.length, Number.isFinite(maxRaw) && maxRaw >= 1 ? maxRaw : 1);
    const min = Math.min(max, Number.isFinite(minRaw) && minRaw >= 0 ? minRaw : 0);
    groups.push({ id, name, min, max, choices });
  }
  return groups;
}

export function hasOptions(raw: unknown): boolean {
  return readOptions(raw).length > 0;
}

export type Priced =
  | { ok: true; unitPrice: number; chosen: ChosenOption[]; choiceIds: string[] }
  | { ok: false; error: string };

/**
 * Checks the choices picked for one item and works out its price. The item's
 * price plus each choice's price, in whole cents. Returns the choices in menu
 * order, so the same picks always come out the same way.
 */
export function priceSelection(basePrice: number, groups: OptionGroup[], picked: unknown): Priced {
  const ids = picked === undefined || picked === null ? [] : picked;
  if (!Array.isArray(ids) || ids.length > MAX_PICKS_PER_LINE || ids.some(x => typeof x !== "string")) {
    return { ok: false, error: "Some options in your order aren't valid. Please choose them again." };
  }
  const wanted = new Set(ids as string[]);
  if (wanted.size !== ids.length) {
    return { ok: false, error: "Some options in your order aren't valid. Please choose them again." };
  }

  const known = new Set(groups.flatMap(g => g.choices.map(c => c.id)));
  for (const id of wanted) {
    if (!known.has(id)) return { ok: false, error: "An option in your order isn't on the menu any more. Please choose again." };
  }

  let total = cents(basePrice);
  const chosen: ChosenOption[] = [];
  const choiceIds: string[] = [];
  for (const g of groups) {
    const inGroup = g.choices.filter(c => wanted.has(c.id));
    for (const c of inGroup) {
      if (!c.available) return { ok: false, error: `${c.name} is sold out. Please choose something else.` };
    }
    if (inGroup.length < g.min) return { ok: false, error: `Please choose ${g.name.toLowerCase()}.` };
    if (inGroup.length > g.max) return { ok: false, error: `Choose up to ${g.max} for ${g.name.toLowerCase()}.` };
    for (const c of inGroup) {
      total += cents(c.price);
      chosen.push({ group: g.name, name: c.name, price: c.price });
      choiceIds.push(c.id);
    }
  }
  return { ok: true, unitPrice: total / 100, chosen, choiceIds };
}

/**
 * The lowest price the item can be ordered at: its price plus the cheapest
 * picks each required group needs. Shown as "From $X" when choices cost extra.
 */
export function cheapestPrice(basePrice: number, groups: OptionGroup[]): number {
  let total = cents(basePrice);
  for (const g of groups) {
    const prices = g.choices.filter(c => c.available).map(c => cents(c.price)).sort((a, b) => a - b);
    for (const p of prices.slice(0, g.min)) total += p;
  }
  return total / 100;
}

/** True when some choice costs extra, so the menu should say "From". */
export function pricesVary(groups: OptionGroup[]): boolean {
  return groups.some(g => g.choices.some(c => c.price > 0));
}

/** One key per item and set of choices, so the same picks share a cart line. */
export function lineKey(itemId: string, choiceIds: readonly string[] = []): string {
  return choiceIds.length ? `${itemId}:${[...choiceIds].sort().join(",")}` : itemId;
}

/** "Large, Extra cheese" */
export function optionsLabel(chosen: readonly { name: string }[] | undefined | null): string {
  return (chosen ?? []).map(c => c.name).join(", ");
}

/** The rule shown under a group's name, e.g. "Required · pick 1". */
export function groupRule(g: Pick<OptionGroup, "min" | "max">): string {
  if (g.min === 0) return g.max === 1 ? "Optional · pick 1" : `Optional · up to ${g.max}`;
  if (g.min === g.max) return `Required · pick ${g.min}`;
  return `Required · pick ${g.min} to ${g.max}`;
}

/**
 * The picks after tapping a choice. In a pick-one group the tap swaps the
 * choice. Otherwise it adds or removes it, and does nothing once the group is
 * full. Sold-out choices can't be picked.
 */
export function toggleChoice(groups: OptionGroup[], picked: readonly string[], choiceId: string): string[] {
  const group = groups.find(g => g.choices.some(c => c.id === choiceId));
  const choice = group?.choices.find(c => c.id === choiceId);
  if (!group || !choice) return [...picked];
  if (picked.includes(choiceId)) return picked.filter(id => id !== choiceId);
  if (!choice.available) return [...picked];

  const inGroup = new Set(group.choices.map(c => c.id));
  if (group.max === 1) return [...picked.filter(id => !inGroup.has(id)), choiceId];
  const count = picked.filter(id => inGroup.has(id)).length;
  return count >= group.max ? [...picked] : [...picked, choiceId];
}

/** A short random id for a new group or choice. */
export function newOptionId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => (b % 36).toString(36)).join("");
}

/**
 * Add-ons found by the menu read ("extra toppings $3 each: olives, chilli")
 * become an optional Extras group. The customer can pick any number of them,
 * and each adds its own price.
 */
export function extrasFromImport(extras: readonly { name: string; price: number }[] | undefined | null): OptionGroup | null {
  const seen = new Set<string>();
  const clean = (extras ?? [])
    .map(v => ({ name: cleanName(v?.name), price: cleanPrice(v?.price) }))
    .filter((v): v is { name: string; price: number } => {
      if (!v.name || v.price === null || seen.has(v.name.toLowerCase())) return false;
      seen.add(v.name.toLowerCase());
      return true;
    })
    .slice(0, MAX_CHOICES);
  if (!clean.length) return null;
  return {
    id: newOptionId(),
    name: "Extras",
    min: 0,
    max: clean.length,
    choices: clean.map(v => ({ id: newOptionId(), name: v.name, price: v.price, available: true })),
  };
}

/**
 * Sizes found by the website import ("Small $12, Large $16") become a
 * required Size group. The item's price is the smallest size, and each size
 * adds the difference.
 */
export function sizesFromVariants(variants: readonly { name: string; price: number }[] | undefined | null):
  { basePrice: number; group: OptionGroup } | null {
  const clean = (variants ?? [])
    .map(v => ({ name: cleanName(v?.name), price: cleanPrice(v?.price) }))
    .filter((v): v is { name: string; price: number } => Boolean(v.name) && v.price !== null && v.price > 0)
    .slice(0, MAX_CHOICES);
  if (clean.length < 2) return null;

  const base = Math.min(...clean.map(v => v.price));
  return {
    basePrice: base,
    group: {
      id: newOptionId(),
      name: "Size",
      min: 1,
      max: 1,
      choices: clean.map(v => ({ id: newOptionId(), name: v.name, price: (cents(v.price) - cents(base)) / 100, available: true })),
    },
  };
}

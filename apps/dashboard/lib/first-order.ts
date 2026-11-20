// ─── First order offer ──────────────────────────────────────────────────────
// A set amount off a customer's first online order with a shop, over a
// minimum spend. It's what the counter QR code promises, so it has to be real.
// The shop pays for it: the discount comes off what the customer pays on the
// shop's own Stripe account.
//
// Set in settings.ordering.first_order { enabled, amount, min_order }, from the
// Settings page's Online ordering card or the wizard's Website step.
//
// "First" means no earlier online order from that mobile number at this shop.
// Checkout (POST /api/store/checkout) checks it, takes the money off with a
// one-use Stripe coupon on the shop's account, and puts the amount in the
// session's metadata. The webhook saves it on the order (orders.discount,
// migration 024). Someone could claim it twice with a second mobile number,
// which is why the amount is capped and a minimum spend is required.

import { auPhone } from "@/lib/customer-import";

export const MAX_OFFER = 25;

export type FirstOrderOffer = { enabled: boolean; amount: number; minOrder: number };

const money = (v: unknown) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** The shop's offer. Off unless the amount is between $1 and $25 and the minimum is more than the amount. */
export function readFirstOrderOffer(settings: unknown): FirstOrderOffer {
  const s = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  const ordering = (s.ordering && typeof s.ordering === "object" ? s.ordering : {}) as Record<string, unknown>;
  const f = (ordering.first_order && typeof ordering.first_order === "object" ? ordering.first_order : {}) as Record<string, unknown>;
  const amount = money(f.amount);
  const minOrder = money(f.min_order);
  const valid = amount >= 1 && amount <= MAX_OFFER && minOrder > amount;
  return { enabled: f.enabled === true && valid, amount: valid ? amount : 0, minOrder: valid ? minOrder : 0 };
}

const dollars = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** "$10 off your first online order of $30 or more", or null when it's off. */
export function offerText(o: FirstOrderOffer): string | null {
  return o.enabled ? `${dollars(o.amount)} off your first online order of ${dollars(o.minOrder)} or more` : null;
}

/** Why a settings form's offer can't be saved, or null if it can. */
export function offerProblem(amount: number, minOrder: number): string | null {
  if (!(amount >= 1)) return "The offer needs to be at least $1.";
  if (amount > MAX_OFFER) return `Keep the offer to $${MAX_OFFER} or less. Someone could claim it again with a second mobile number.`;
  if (!(minOrder > amount)) return "The minimum spend has to be more than the offer.";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

export type OfferResult = { cents: number; note: string | null };

/**
 * How much comes off this order, in cents. 0 with a note saying why when it
 * doesn't apply (the note is for the ordering page, never an error).
 * subtotalCents is the items only, before any delivery fee.
 */
export async function firstOrderDiscount(db: Db, businessId: string, offer: FirstOrderOffer, phoneRaw: unknown, subtotalCents: number): Promise<OfferResult> {
  if (!offer.enabled) return { cents: 0, note: null };
  if (subtotalCents < Math.round(offer.minOrder * 100)) return { cents: 0, note: `Spend ${dollars(offer.minOrder)} or more for the first order offer.` };
  const phone = auPhone(typeof phoneRaw === "string" ? phoneRaw : null);
  if (!phone || !phone.startsWith("+614")) return { cents: 0, note: "Add your mobile number to get the first order offer." };

  const local = `0${phone.slice(3)}`;
  const { data: people } = await db.from("customers").select("id")
    .eq("business_id", businessId).in("phone", [phone, local, phone.slice(1)]);
  const ids = ((people ?? []) as { id: string }[]).map(p => p.id);
  if (ids.length) {
    const { count } = await db.from("orders").select("id", { count: "exact", head: true })
      .eq("business_id", businessId).eq("source", "direct").in("customer_id", ids);
    if ((count ?? 0) > 0) return { cents: 0, note: "The first order offer is for a first online order." };
  }
  // Stripe needs at least 50c paid, so the discount never takes the order below that.
  const cents = Math.min(Math.round(offer.amount * 100), subtotalCents - 50);
  return cents > 0 ? { cents, note: null } : { cents: 0, note: null };
}

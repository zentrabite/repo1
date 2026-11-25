// How many checkouts one person, and one shop, can start (migration 040).
//
// The ordering page needs no login, and every checkout makes two to four
// calls to Stripe on the shop's account. A script without a limit could fill
// a shop's Stripe account with checkouts and coupons, and use up ZentraBite's
// Stripe rate limit, which refunds and every other shop also need. Found in
// the second security run (25 Nov 2026).
//
// Counted from saved rows, like the enquiry limit (lib/enquiries.ts), so it
// works across serverless instances. The address is stored only as a keyed
// hash. A customer who changes their mind a few times never gets near these.

import "server-only";
import crypto from "node:crypto";
import { clientIp, ipKey } from "@/lib/enquiries";
import { signingKey } from "@/lib/signing-key";

const MINUTE = 60 * 1000;

export const CHECKOUT_LIMITS = {
  // One person at one shop.
  personAtShop: [{ windowMs: 10 * MINUTE, max: 10 }, { windowMs: 60 * MINUTE, max: 30 }],
  // One person across every shop.
  person: [{ windowMs: 60 * MINUTE, max: 60 }],
  // Everyone at one shop. Far above a busy takeaway's dinner rush.
  shop: [{ windowMs: 10 * MINUTE, max: 200 }],
} as const;

const KEEP_MS = 2 * 24 * 60 * MINUTE;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type CheckoutLimit = { ok: true } | { ok: false; retryAfter: number };

async function personKey(db: Db, headers: { get(name: string): string | null }): Promise<string> {
  const key = await signingKey(db, "zentrabite:checkout-ip:v1");
  const ip = ipKey(clientIp(headers));
  // Without the key the address still isn't stored as it is.
  return crypto.createHmac("sha256", key ?? "zentrabite-checkout-ip").update(ip).digest("base64url").slice(0, 32);
}

async function countSince(db: Db, filters: Record<string, string>, since: Date): Promise<number> {
  let q = db.from("checkout_starts").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString());
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Whether this checkout can start, and if so it's counted. If the count
 * can't be read the checkout goes ahead, because a customer who can't pay
 * is worse than a few extra checkouts.
 */
export async function checkoutAllowed(db: Db, businessId: string, headers: { get(name: string): string | null }, now = new Date()): Promise<CheckoutLimit> {
  let person: string;
  try {
    person = await personKey(db, headers);
    const checks: [Record<string, string>, readonly { windowMs: number; max: number }[]][] = [
      [{ business_id: businessId, ip_key: person }, CHECKOUT_LIMITS.personAtShop],
      [{ ip_key: person }, CHECKOUT_LIMITS.person],
      [{ business_id: businessId }, CHECKOUT_LIMITS.shop],
    ];
    for (const [filters, limits] of checks) {
      for (const { windowMs, max } of limits) {
        if ((await countSince(db, filters, new Date(now.getTime() - windowMs))) >= max) {
          return { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
        }
      }
    }
  } catch (err) {
    console.error("[checkout-limit] couldn't count checkouts", err instanceof Error ? err.message : err);
    return { ok: true };
  }

  await db.from("checkout_starts").insert({ business_id: businessId, ip_key: person, created_at: now.toISOString() })
    .then(() => undefined, () => undefined);
  // Old rows go now and then, so the table stays small.
  if (Math.random() < 0.02) {
    await db.from("checkout_starts").delete().lt("created_at", new Date(now.getTime() - KEEP_MS).toISOString())
      .then(() => undefined, () => undefined);
  }
  return { ok: true };
}

// A signature on every online checkout we make, so the Stripe webhook only
// turns checkouts our own server made into orders.
//
// Why. Each shop has its own full Stripe account with its own API keys. The
// webhook already checks a checkout came from the shop's own account, but a
// shop could make a checkout there itself with any metadata it likes, and the
// webhook would then save a paid order with any customer, mark them as having
// agreed to marketing, email them a receipt from our domain and text the
// order alert to any number. Found in the second security run (25 Nov 2026).
//
// How. /api/store/checkout signs the session's metadata with a key only our
// server holds (lib/signing-key.ts) and a time it's good until, a few minutes
// after the checkout itself ends. The webhook checks the signature, and that
// the session was made before that time, so an old signature can't be reused
// on a new checkout later.

import "server-only";
import crypto from "node:crypto";
import { signingKey } from "@/lib/signing-key";

export const CHECKOUT_LABEL = "zentrabite:checkout-metadata:v1";
export const SIG_KEY = "zb_sig";
export const UNTIL_KEY = "zb_until";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** The text that's signed: every metadata key but the signature, in order. */
function canonical(meta: Record<string, string>): string {
  return JSON.stringify(Object.keys(meta).filter(k => k !== SIG_KEY).sort().map(k => [k, meta[k]]));
}

export function signWithKey(meta: Record<string, string>, key: Buffer): string {
  return crypto.createHmac("sha256", key).update(canonical(meta)).digest("base64url");
}

/** The metadata with its good-until time and signature, or null if the key can't be read. */
export async function signCheckout(db: Db, meta: Record<string, string>, until: number): Promise<Record<string, string> | null> {
  const key = await signingKey(db, CHECKOUT_LABEL);
  if (!key) return null;
  const withUntil = { ...meta, [UNTIL_KEY]: String(Math.floor(until)) };
  return { ...withUntil, [SIG_KEY]: signWithKey(withUntil, key) };
}

export type CheckoutCheck = { ok: true } | { ok: false; why: "unsigned" | "bad" | "late" | "key" };

/** Whether a completed session's metadata is ours. `created` is the session's own created time. */
export async function checkCheckout(db: Db, meta: Record<string, string>, created: number | null | undefined): Promise<CheckoutCheck> {
  const given = meta[SIG_KEY];
  if (!given) return { ok: false, why: "unsigned" };
  const key = await signingKey(db, CHECKOUT_LABEL);
  if (!key) return { ok: false, why: "key" };
  const a = Buffer.from(given);
  const b = Buffer.from(signWithKey(meta, key));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, why: "bad" };
  const until = Number(meta[UNTIL_KEY]);
  if (!Number.isFinite(until) || typeof created !== "number" || created > until) return { ok: false, why: "late" };
  return { ok: true };
}

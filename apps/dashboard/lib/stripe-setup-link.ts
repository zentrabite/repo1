// ─── The owner's Stripe setup link ──────────────────────────────────────────
// A link the owner opens to set up payments with Stripe before they have a
// ZentraBite login: <app>/stripe-setup/<code>. Made when the shop is sold
// (POST /api/admin/onboarding), or again by staff from the onboarding wizard.
// One per shop, so a new link stops the old one working.
//
// The code is 32 random bytes. Only its SHA-256 hash is stored (table
// stripe_setup_links, migration 023), so the database can't be used to open
// a link. A link works for SETUP_LINK_DAYS days and stops once the shop takes
// payments.
//
// Whoever finishes Stripe's setup chooses the bank account the shop's money
// goes to, so the link is emailed to the owner and shown to staff only.
// Sellers never see it.

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/email";

export const SETUP_LINK_DAYS = 14;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

const hash = (code: string) => createHash("sha256").update(code).digest("hex");
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/$/, "");

/** A code is 43 base64url characters. Anything else is turned away unread. */
export const looksLikeCode = (code: unknown): code is string => typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code);

/** Makes the shop's link, replacing any earlier one. */
export async function newSetupLink(db: Db, businessId: string, createdBy: string | null): Promise<{ url: string; expiresAt: string }> {
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SETUP_LINK_DAYS * 24 * 60 * 60_000).toISOString();
  const { error } = await db.from("stripe_setup_links").upsert(
    { business_id: businessId, token_hash: hash(code), expires_at: expiresAt, created_by: createdBy, created_at: new Date().toISOString(), opened_at: null },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(`saving the Stripe link failed: ${error.message}`);
  return { url: `${appUrl()}/stripe-setup/${code}`, expiresAt };
}

export type SetupShop = { id: string; name: string; stripe_charges_enabled: boolean | null };

/** The shop a link is for, or why it can't be used. */
export async function findSetupLink(db: Db, code: unknown):
  Promise<{ ok: true; shop: SetupShop } | { ok: false; reason: "unknown" | "expired" }> {
  if (!looksLikeCode(code)) return { ok: false, reason: "unknown" };
  const { data: link } = await db.from("stripe_setup_links")
    .select("business_id, expires_at")
    .eq("token_hash", hash(code))
    .maybeSingle();
  if (!link) return { ok: false, reason: "unknown" };
  if (Date.parse(link.expires_at) < Date.now()) return { ok: false, reason: "expired" };
  const { data: shop } = await db.from("businesses")
    .select("id, name, stripe_charges_enabled")
    .eq("id", link.business_id)
    .maybeSingle();
  if (!shop) return { ok: false, reason: "unknown" };
  return { ok: true, shop };
}

/** Emails the link to the owner. False if it didn't send (Resend isn't set up yet). */
export async function emailSetupLink(to: string | null | undefined, ownerName: string | null | undefined, shopName: string, url: string): Promise<boolean> {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const hi = ownerName?.trim() ? `Hi ${ownerName.trim().split(/\s+/)[0]},` : "Hi,";
  const result = await sendEmail({
    to,
    subject: `Set up payments for ${shopName}`,
    text: [
      hi, "",
      `Your online orders for ${shopName} are paid straight into your own Stripe account. Stripe needs a few details before the money can reach you.`, "",
      "Have these ready. It takes about 10 minutes.",
      "- your ABN",
      "- photo ID for the person who runs the business",
      "- the bank account you'd like paid into", "",
      `Start here: ${url}`, "",
      `The link works for ${SETUP_LINK_DAYS} days. If it runs out, ask the ZentraBite team for a new one.`,
      "If you weren't expecting this, you can ignore it.", "",
      "ZentraBite",
    ].join("\n"),
  }).catch(() => ({ ok: false }));
  return Boolean(result.ok);
}

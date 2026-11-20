// ─── Go-live check ──────────────────────────────────────────────────────────
// What has to be true before a shop's website is published and starts taking
// orders. Shown in the onboarding wizard's Website step, and checked again by
// PATCH /api/admin/onboarding/[id] before it will publish, so nothing goes
// live with a gap. The setup board in super admin uses the same checks.
//
// goLiveChecks is pure. readGoLive gathers what it needs from the database.

import "server-only";

export type GoLiveCheck = {
  key:    "details" | "address" | "hours" | "menu" | "payments" | "alerts" | "owner" | "test_order";
  label:  string;
  ok:     boolean;
  detail: string;       // what's missing, or what was found
  step:   number | null; // the wizard step that fixes it
};

export type GoLiveFacts = {
  biz: {
    name: string | null; subdomain: string | null; address: string | null; abn: string | null;
    contact_phone?: string | null;
    stripe_charges_enabled: boolean | null; stripe_payouts_enabled: boolean | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: Record<string, any> | null;
  };
  pricedItems: number;   // menu items that are on and have a price
  paidOrders:  number;   // orders paid online through Stripe
  ownerLogin:  boolean;  // a login is linked to the shop as its owner
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function goLiveChecks(f: GoLiveFacts): GoLiveCheck[] {
  const s = f.biz.settings ?? {};
  const phone = (s.phone as string | undefined)?.trim() || f.biz.contact_phone?.trim() || "";
  const abn = f.biz.abn?.trim() || (s.abn as string | undefined)?.trim() || "";
  const missing = [
    !f.biz.name?.trim() && "name",
    !f.biz.address?.trim() && "street address",
    !phone && "phone",
    !abn && "ABN",
  ].filter(Boolean) as string[];

  const hours = (s.hours ?? {}) as Record<string, { closed?: boolean; open?: string; close?: string }>;
  const openDays = DAYS.filter(d => hours[d] && !hours[d]!.closed && hours[d]!.open && hours[d]!.close);

  const charges = f.biz.stripe_charges_enabled === true;
  const payouts = f.biz.stripe_payouts_enabled === true;
  const alertsTo = [s.notify_email, s.notify_phone].filter(v => typeof v === "string" && v.trim());

  return [
    { key: "details", label: "Shop details", step: 1, ok: missing.length === 0,
      detail: missing.length ? `Missing the ${list(missing)}.` : "Name, address, phone and ABN are in." },
    { key: "address", label: "Website address", step: 1, ok: Boolean(f.biz.subdomain),
      detail: f.biz.subdomain ? `${f.biz.subdomain}.zentrabite.com` : "Pick their address in Basics." },
    { key: "hours", label: "Opening hours", step: 2, ok: openDays.length > 0,
      detail: openDays.length ? `Open ${openDays.length} day${openDays.length === 1 ? "" : "s"} a week. Check them with the owner.` : "No open days. Set the hours." },
    { key: "menu", label: "Menu", step: 4, ok: f.pricedItems > 0,
      detail: f.pricedItems ? `${f.pricedItems} item${f.pricedItems === 1 ? "" : "s"} on sale with a price.` : "Nothing on sale with a price. Seed the menu." },
    { key: "payments", label: "Payments", step: 5, ok: charges && payouts,
      detail: charges && payouts ? "Stripe takes payments and pays the shop."
        : charges ? "Stripe takes payments but can't pay the shop yet. The owner needs to finish Stripe's bank step."
        : "Stripe isn't taking payments yet. The owner needs to finish Stripe's setup." },
    { key: "alerts", label: "Order alerts", step: 7, ok: alertsTo.length > 0,
      detail: alertsTo.length ? "New orders are sent to the shop." : "Add an email or mobile for new order alerts." },
    { key: "owner", label: "Owner's login", step: null, ok: f.ownerLogin,
      detail: f.ownerLogin ? "The owner has a login to the shop." : "Send the owner their login." },
    { key: "test_order", label: "A paid test order", step: null, ok: f.paidOrders > 0,
      detail: f.paidOrders ? "An order has been paid online." : "Order on their ordering page and pay, then refund it on the Orders page." },
  ];
}

export const isReady = (checks: GoLiveCheck[]) => checks.every(c => c.ok);

function list(xs: string[]): string {
  return xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

/** The checks for one shop, or null if there's no such shop. */
export async function readGoLive(db: Db, businessId: string): Promise<{ checks: GoLiveCheck[]; ready: boolean } | null> {
  const [bizRes, itemsRes, ordersRes, ownerRes] = await Promise.all([
    db.from("businesses")
      .select("name, subdomain, address, abn, contact_phone, settings, stripe_charges_enabled, stripe_payouts_enabled")
      .eq("id", businessId).maybeSingle(),
    db.from("menu_items").select("price, available").eq("business_id", businessId).limit(2000),
    // Only the payment webhook makes "direct" orders, and only once Stripe says paid.
    db.from("orders").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("source", "direct"),
    // A login whose users.business_id is the shop is its owner (lib/request-business.ts).
    db.from("users").select("id").eq("business_id", businessId).limit(1),
  ]);
  if (!bizRes.data) return null;
  const items = (itemsRes.data ?? []) as { price: number | string | null; available: boolean | null }[];
  const checks = goLiveChecks({
    biz:         bizRes.data,
    pricedItems: items.filter(i => i.available !== false && Number(i.price) > 0).length,
    paidOrders:  ordersRes.count ?? 0,
    ownerLogin:  Boolean(ownerRes.data?.length),
  });
  return { checks, ready: isReady(checks) };
}

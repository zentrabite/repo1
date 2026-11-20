// ─── Setup board ────────────────────────────────────────────────────────────
// Every shop that isn't live yet, oldest sale first, with the wizard step it's
// on and what it's waiting for, so nothing a seller signs sits untouched.
// Super admin only (GET /api/admin/setup-board, page /admin/setup).
//
// "Waiting for" is the go-live check (lib/go-live.ts) for each shop, worked
// out from a handful of reads for all the shops at once. Two things the plan
// lists aren't here, because neither exists in the CRM yet: a text sender name
// for each shop, and connecting a shop's own domain.

import "server-only";
import { goLiveChecks, type GoLiveCheck } from "./go-live";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

export type BoardShop = {
  id:        string;
  name:      string;
  suburb:    string | null;
  soldBy:    string | null;   // the seller's name, or null when staff made it
  since:     string;          // sold_at, or created_at for a shop staff made
  days:      number;          // whole days since then
  step:      number;          // the wizard step it was left on (1 to 9)
  gaps:      Pick<GoLiveCheck, "key" | "label" | "detail">[];
  stripeLink: { opened: boolean; expired: boolean } | null;
};

export async function readSetupBoard(db: Db, now = new Date()): Promise<{ shops: BoardShop[]; live: number }> {
  const { data: all, error } = await db.from("businesses")
    .select("id, name, suburb, subdomain, address, abn, contact_phone, settings, stripe_charges_enabled, stripe_payouts_enabled, sold_by, sold_at, created_at")
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(`reading shops failed: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (all ?? []) as any[];
  const notLive = rows.filter(b => b.settings?.site?.published !== true);
  const ids = notLive.map(b => b.id as string);
  if (!ids.length) return { shops: [], live: rows.length };

  const sellerIds = [...new Set(notLive.map(b => b.sold_by).filter(Boolean))] as string[];
  const [itemsRes, ordersRes, ownersRes, linksRes, sellersRes] = await Promise.all([
    db.from("menu_items").select("business_id, price, available").in("business_id", ids).limit(20000),
    db.from("orders").select("business_id").in("business_id", ids).eq("source", "direct").limit(20000),
    db.from("users").select("business_id").in("business_id", ids),
    db.from("stripe_setup_links").select("business_id, expires_at, opened_at").in("business_id", ids),
    sellerIds.length ? db.from("users").select("id, name, email").in("id", sellerIds) : Promise.resolve({ data: [] }),
  ]);

  const count = (list: { business_id: string }[] | null, keep: (r: never) => boolean = () => true) => {
    const m = new Map<string, number>();
    for (const r of list ?? []) if (keep(r as never)) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1);
    return m;
  };
  const priced = count(itemsRes.data, (i: { available: boolean | null; price: unknown }) => i.available !== false && Number(i.price) > 0);
  const paid = count(ordersRes.data);
  const owners = count(ownersRes.data);
  const links = new Map(((linksRes.data ?? []) as { business_id: string; expires_at: string; opened_at: string | null }[]).map(l => [l.business_id, l]));
  const sellers = new Map(((sellersRes.data ?? []) as { id: string; name: string | null; email: string | null }[]).map(s => [s.id, s.name || s.email]));

  const shops: BoardShop[] = notLive.map(b => {
    const checks = goLiveChecks({
      biz:         b,
      pricedItems: priced.get(b.id) ?? 0,
      paidOrders:  paid.get(b.id) ?? 0,
      ownerLogin:  (owners.get(b.id) ?? 0) > 0,
    });
    const since = (b.sold_at ?? b.created_at) as string;
    const link = links.get(b.id);
    return {
      id:     b.id,
      name:   b.name ?? "Unnamed shop",
      suburb: b.suburb ?? null,
      soldBy: b.sold_by ? sellers.get(b.sold_by) ?? "A seller" : null,
      since,
      days:   Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / 86_400_000)),
      step:   Number(b.settings?.onboarding?.step) || 1,
      gaps:   checks.filter(c => !c.ok).map(({ key, label, detail }) => ({ key, label, detail })),
      stripeLink: link ? { opened: Boolean(link.opened_at), expired: Date.parse(link.expires_at) < now.getTime() } : null,
    };
  });
  // Oldest first, so the shops waiting longest are at the top.
  shops.sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
  return { shops, live: rows.length - notLive.length };
}

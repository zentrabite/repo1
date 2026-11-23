// ─── The business snapshot the AI Copilot answers from ──────────────────────
// /api/copilot reads the rows and this turns them into the text the model
// sees. Kept apart from the route so the numbers can be tested.
//
// Today is the shop's own day (its time zone, Adelaide by default), the same
// as Analytics and the dashboard. Sales are less refunds (netTotal). Orders
// are split by where they came from, online (direct) and at the counter (pos).
//
// Anything a person typed (the shop's name, stock item names) goes in as one
// short line, so it can't pose as the end of the snapshot or as instructions.

import { netTotal } from "@/lib/refunds";
import { shopDate, shopTime } from "@/lib/pickup-times";

export type SnapshotOrder = { total: number | string; source?: string | null; status?: string | null; refunded_amount?: number | string | null };

export type SnapshotData = {
  business: { name?: string | null; type?: string | null; subdomain?: string | null } | null;
  todayOrders: SnapshotOrder[];
  weekOrders: SnapshotOrder[];
  customers: { segment?: string | null }[];
  winback: { is_active?: boolean | null; revenue?: number | string | null }[];
  recommendations: { title?: string | null; priority?: string | null }[];
  stock: { name?: string | null; on_hand?: number | string | null; par_level?: number | string | null }[];
  reviews: { rating?: number | null; status?: string | null }[];
};

/** One line, no snapshot markers, at most max characters. */
export function plainLine(value: unknown, max = 60): string {
  const text = String(value ?? "")
    .replace(/[\x00-\x1f\x7f\u2028\u2029]+/g, " ")
    .replace(/={2,}/g, "=")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export function buildSnapshot(d: SnapshotData, now: Date, timezone: string): string {
  const today = d.todayOrders;
  const online = today.filter(o => o.source === "direct").length;
  const counter = today.filter(o => o.source === "pos").length;
  const other = today.length - online - counter;
  const waiting = today.filter(o => o.status === "New").length;

  const seg = (name: string) => d.customers.filter(c => c.segment === name).length;
  const winbackRevenue = d.winback.reduce((s, r) => s + num(r.revenue), 0);
  const lowStock = d.stock.filter(s => num(s.on_hand) <= num(s.par_level));
  const rated = d.reviews.filter(r => typeof r.rating === "number");
  const avgRating = rated.length ? (rated.reduce((s, r) => s + num(r.rating), 0) / rated.length).toFixed(1) : "none yet";

  const when = `${shopDate(now, timezone)}, ${shopTime(now, timezone)}`;

  return `
=== BUSINESS SNAPSHOT (live data, ${when} shop time) ===

Business: ${plainLine(d.business?.name) || "Unknown"} (${plainLine(d.business?.type, 30) || "type not set"})
Ordering site: ${d.business?.subdomain ? `https://${plainLine(d.business.subdomain, 63)}.zentrabite.com` : "not set"}

TODAY (since midnight, shop time):
- Orders: ${today.length} (${waiting} new, waiting to be accepted)
- Sales less refunds: ${money(today.reduce((s, o) => s + netTotal(o), 0))}
- Where they came from: ${online} online, ${counter} at the counter${other > 0 ? `, ${other} other` : ""}

LAST 7 DAYS:
- Orders: ${d.weekOrders.length}
- Sales less refunds: ${money(d.weekOrders.reduce((s, o) => s + netTotal(o), 0))}

CUSTOMERS (${d.customers.length} total):
- VIP: ${seg("VIP")}
- Regular: ${seg("Regular")}
- New: ${seg("New")}
- At Risk: ${seg("At Risk")}

WIN-BACK:
- Active rules: ${d.winback.filter(r => r.is_active).length} of ${d.winback.length}
- Recovered so far: ${money(winbackRevenue)}

REVIEWS (last 30 days):
- Total: ${d.reviews.length}
- Average rating: ${avgRating}
- Waiting for a reply: ${d.reviews.filter(r => r.status === "pending").length}

LOW STOCK (at or under par): ${lowStock.length
    ? lowStock.map(s => `${plainLine(s.name, 40)} (${num(s.on_hand)} of ${num(s.par_level)})`).join(", ")
    : "none"}

OPEN SUGGESTIONS: ${d.recommendations.length
    ? d.recommendations.map(r => `[${plainLine(r.priority, 10)}] ${plainLine(r.title, 80)}`).join(" · ")
    : "none"}
=== END SNAPSHOT ===
`.trim();
}

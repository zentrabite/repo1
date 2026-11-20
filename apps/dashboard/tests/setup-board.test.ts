// Tests for the setup board: which shops show, in what order, and what each
// is waiting for. The database and the login check are fakes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  superAdmin: null as null | { id: string },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));

import { readSetupBoard } from "@/lib/setup-board";
import { GET as board } from "@/app/api/admin/setup-board/route";

const NOW = new Date("2026-11-20T12:00:00Z");
const OPEN = { open: "11:00", close: "21:00", closed: false };
const base = {
  suburb: "Norwood", address: "1 The Parade", abn: "51824753556", contact_phone: null, sold_by: null,
  stripe_charges_enabled: false, stripe_payouts_enabled: false,
};
const SHOPS = [
  { ...base, id: "live", name: "Nonna's", created_at: "2026-10-01T00:00:00Z", sold_at: null, settings: { site: { published: true } } },
  { ...base, id: "new", name: "Joe's Pizza", sold_by: "seller-1", created_at: "2026-11-19T00:00:00Z", sold_at: "2026-11-19T00:00:00Z",
    settings: { onboarding: { step: 1 }, phone: "0881234567" } },
  { ...base, id: "old", name: "Sam's Subs", created_at: "2026-11-10T00:00:00Z", sold_at: null, subdomain: "sams-subs",
    stripe_charges_enabled: true, stripe_payouts_enabled: true,
    settings: { onboarding: { step: 8 }, phone: "0881234567", hours: { mon: OPEN }, notify_email: "sam@x.com" } },
];

beforeEach(() => {
  h.superAdmin = { id: "staff-1" };
  h.db = fakeDb({
    "businesses.select": () => ({ data: SHOPS, error: null }),
    "menu_items.select": () => ({ data: [{ business_id: "old", price: 12, available: true }, { business_id: "new", price: 0, available: true }], error: null }),
    "orders.select": () => ({ data: [{ business_id: "old" }], error: null }),
    "users.select": q => (q.columns === "business_id"
      ? { data: [{ business_id: "old" }], error: null }
      : { data: [{ id: "seller-1", name: "Sam Lee", email: "sam@example.com" }], error: null }),
    "stripe_setup_links.select": () => ({ data: [{ business_id: "new", expires_at: "2026-12-03T00:00:00Z", opened_at: null }], error: null }),
  });
});

describe("the setup board", () => {
  it("lists shops that aren't live, oldest first, and counts the live ones", async () => {
    const { shops, live } = await readSetupBoard(h.db, NOW);
    expect(live).toBe(1);
    expect(shops.map(s => s.id)).toEqual(["old", "new"]);
  });

  it("says what each shop is waiting for, who sold it and how long ago", async () => {
    const { shops } = await readSetupBoard(h.db, NOW);
    const [old, fresh] = shops;
    expect(old).toMatchObject({ name: "Sam's Subs", soldBy: null, days: 10, step: 8, stripeLink: null });
    expect(old!.gaps).toEqual([]);
    expect(fresh).toMatchObject({ soldBy: "Sam Lee", days: 1, step: 1, stripeLink: { opened: false, expired: false } });
    expect(fresh!.gaps.map(g => g.key)).toEqual(["address", "hours", "menu", "payments", "alerts", "owner", "test_order"]);
  });

  it("is for super admins only", async () => {
    h.superAdmin = null;
    expect((await board()).status).toBe(403);
    h.superAdmin = { id: "staff-1" };
    const res = await board();
    expect(res.status).toBe(200);
    expect((await res.json()).shops).toHaveLength(2);
  });

  it("has nothing to show when every shop is live", async () => {
    h.db = fakeDb({ "businesses.select": () => ({ data: [SHOPS[0]], error: null }) });
    expect(await readSetupBoard(h.db, NOW)).toEqual({ shops: [], live: 1 });
  });
});

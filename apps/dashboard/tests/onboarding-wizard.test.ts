// Found in the first test shop run (26 Nov 2026). Seeding the menu twice put
// every item on twice, and the Delivery step saved courier keys in the
// businesses row, where every login at the shop can read them. Now seeding
// only works on a shop with no menu, and the wizard's save route drops
// settings.delivery. Courier keys go through /api/delivery/keys (038).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  superAdmin: null as null | { id: string },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));

import { POST as seedMenu } from "@/app/api/admin/onboarding/[id]/seed-menu/route";
import { PATCH as saveShop } from "@/app/api/admin/onboarding/[id]/route";

const ID = "biz-1";
const ctx = { params: Promise.resolve({ id: ID }) };
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const post = (body: object) => seedMenu(new Request(`https://dashboard.zentrabite.com/api/admin/onboarding/${ID}/seed-menu`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), ctx);
const patch = (body: object) => saveShop(new Request(`https://dashboard.zentrabite.com/api/admin/onboarding/${ID}`, {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), ctx);

const MENU = { categories: [{ name: "Pizza", items: [{ name: "Margherita", price: 18 }, { name: "Pepperoni", price: 21 }] }] };

function db(existingCategories: number) {
  h.db = fakeDb({
    "menu_categories.select": () => ({ data: null, error: null, count: existingCategories }),
    "menu_categories.insert": () => ({ data: { id: "cat-1" }, error: null }),
    "menu_items.insert": () => ({ data: null, error: null }),
    "businesses.select": () => ({ data: { settings: { hours: {} } }, error: null }),
    "businesses.update": (q: Query) => ({ data: { id: ID, ...(q.payload as object) }, error: null }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.superAdmin = { id: "staff-1" };
});

describe("seeding the menu", () => {
  it("fills an empty shop's menu", async () => {
    db(0);
    const res = await post(MENU);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ categories: 1, items: 2 });
    expect(calls("menu_items", "insert")).toHaveLength(1);
  });

  it("won't add a second copy to a shop that has a menu", async () => {
    db(5);
    const res = await post(MENU);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already has a menu/);
    expect(calls("menu_categories", "insert")).toHaveLength(0);
    expect(calls("menu_items", "insert")).toHaveLength(0);
  });

  it("is for staff only", async () => {
    db(0);
    h.superAdmin = null;
    expect((await post(MENU)).status).toBe(403);
  });
});

describe("courier keys in the setup wizard", () => {
  it("never saves courier keys in the businesses row", async () => {
    db(0);
    const res = await patch({ settings: { delivery: { uber_direct: { client_secret: "sk-test-123" } }, gst_rate: 10 } });
    expect(res.status).toBe(200);
    const update = calls("businesses", "update")[0]!.payload as { settings: Record<string, unknown> };
    expect(update.settings).not.toHaveProperty("delivery");
    expect(update.settings.gst_rate).toBe(10);
    expect(JSON.stringify(update)).not.toContain("sk-test-123");
  });

  it("the Delivery step saves them through /api/delivery/keys", () => {
    const page = readFileSync(join(__dirname, "../app/admin/onboarding/[id]/page.tsx"), "utf8");
    const step = page.slice(page.indexOf("function StepDelivery"), page.indexOf("function StepNotifications"));
    expect(step).toContain("/api/delivery/keys");
    expect(step).not.toMatch(/settings:\s*\{\s*delivery/);
  });
});

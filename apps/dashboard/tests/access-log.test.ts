// The record of ZentraBite staff opening a shop's CRM as its owner
// (lib/access-log.ts, migration 036).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeDb, filterValue, type Query } from "./fake-db";

vi.mock("server-only", () => ({}));

const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
const SHOP = "bbbbbbbb-0000-4000-8000-000000000002";
const OWN = "cccccccc-0000-4000-8000-000000000003";

const h = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("./fake-db").fakeDb>,
  cookie: null as string | null,
  recentRows: [] as unknown[],
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "zb_impersonate" && h.cookie ? { value: h.cookie } : undefined) }) }));
vi.mock("@/lib/supabase-server", () => ({
  createSessionClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: ADMIN, email: "staff@zentrabite.com" } } }) } }),
  createAdminClient: () => h.db,
}));

import { requireBusiness } from "@/lib/request-business";
import { describeAccess, noteStaffUse, recentAccess } from "@/lib/access-log";
import { DELETE, POST } from "@/app/api/admin/impersonate/route";

function adminDb() {
  return fakeDb({
    "users.select": () => ({ data: { business_id: OWN, is_super_admin: true }, error: null }),
    "businesses.select": (q: Query) => ({ data: { id: filterValue(q, "id"), name: "Nonna's Kitchen" }, error: null }),
    "staff_access_log.select": () => ({ data: h.recentRows, error: null }),
  });
}
const inserts = () => h.db.calls.filter(c => c.table === "staff_access_log" && c.op === "insert").map(c => c.payload);

beforeEach(() => { h.db = adminDb(); h.cookie = null; h.recentRows = []; });

describe("staff opening a shop's CRM", () => {
  it("the Impersonate button records the start, and Stop records the end", async () => {
    const start = await POST(new NextRequest("http://localhost/api/admin/impersonate", { method: "POST", body: JSON.stringify({ businessId: SHOP }) }));
    expect(start.status).toBe(200);
    const stop = await DELETE(new NextRequest("http://localhost/api/admin/impersonate", { method: "DELETE", headers: { cookie: `zb_impersonate=${SHOP}` } }));
    expect(stop.status).toBe(200);
    expect(inserts()).toEqual([
      { business_id: SHOP, staff_id: ADMIN, staff_email: "staff@zentrabite.com", action: "start" },
      { business_id: SHOP, staff_id: ADMIN, staff_email: "staff@zentrabite.com", action: "stop" },
    ]);
  });

  it("using the CRM as a shop through the cookie is recorded once per 4 hours, even without the button", async () => {
    h.cookie = SHOP;
    const auth = await requireBusiness(null);
    expect(auth.ok && auth.businessId).toBe(SHOP);
    expect(inserts()).toEqual([{ business_id: SHOP, staff_id: ADMIN, staff_email: "staff@zentrabite.com", action: "used" }]);

    h.db = adminDb();
    h.recentRows = [{ id: "x" }];
    await requireBusiness(null);
    expect(inserts()).toEqual([]);
  });

  it("isn't recorded for staff working on their own shop or through a Super Admin page", async () => {
    h.cookie = OWN;
    await requireBusiness(null);
    h.cookie = null;
    await requireBusiness(SHOP);
    expect(inserts()).toEqual([]);
  });

  it("never stops the request when the record can't be written", async () => {
    const broken = fakeDb({ "staff_access_log.select": () => ({ data: null, error: { message: "down" } }) });
    await expect(noteStaffUse(broken, SHOP, ADMIN, null)).resolves.toBeUndefined();
    const throwing = { from: () => { throw new Error("boom"); } };
    await expect(noteStaffUse(throwing, SHOP, ADMIN, null)).resolves.toBeUndefined();
  });

  it("lists the latest visits in plain words", async () => {
    const db = fakeDb({ "staff_access_log.select": () => ({ data: [{ action: "start", staff_email: "staff@zentrabite.com", created_at: "2026-11-23T01:00:00Z" }], error: null }) });
    expect(await recentAccess(db, SHOP)).toEqual([{ action: "start", staff_email: "staff@zentrabite.com", created_at: "2026-11-23T01:00:00Z", what: "Opened the CRM as the owner" }]);
    expect(describeAccess("used")).toBe("Used the CRM as the owner");
    expect(describeAccess("stop")).toBe("Closed it");
  });
});

// Tests for the Xero sales export (lib/xero-export.ts and /api/export/xero).
// Before 23 Nov 2026 a refunded order went to Xero at its full amount with no
// credit note, dates were UTC days, the tax type was a code Xero's import
// doesn't take, and a team manager got "No business".

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  auth: { ok: true, businessId: "shop-a", userId: "u1", email: "max@a.com", role: "Manager", isSuperAdmin: false } as Record<string, unknown>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async (_id: unknown, opts?: { roles?: string[] }) =>
    opts?.roles && !opts.roles.includes(String(h.auth.role))
      ? { ok: false, response: new Response(JSON.stringify({ error: "role" }), { status: 403 }) }
      : h.auth),
}));

import { xeroDate, xeroRows, XERO_HEADER } from "@/lib/xero-export";
import { GET as exportXero } from "@/app/api/export/xero/route";

const TZ = "Australia/Adelaide";
const sale = { id: "aaaa1111-2222", total: 42.5, refunded_amount: 0, refunded_at: null, source: "direct", created_at: "2026-11-21T22:00:00Z", customers: { name: "Sofia Rossi", email: "s@x.com" } };
const counter = { id: "bbbb1111-2222", total: "12.00", source: "pos", created_at: "2026-11-21T03:00:00Z", customers: null };
const refunded = { id: "cccc1111-2222", total: 30, refunded_amount: 10, refunded_at: "2026-11-22T23:30:00Z", source: "direct", created_at: "2026-11-20T03:00:00Z", customers: { name: null, email: "jess@x.com" } };

describe("the rows", () => {
  it("an invoice per sale on the shop's day, and a credit note per refund on the refund's day", () => {
    expect(xeroRows([sale, counter], [refunded], { timeZone: TZ })).toEqual([
      XERO_HEADER,
      ["Sofia Rossi", "ZB-AAAA1111", "22/11/2026", "22/11/2026", "Online order", "1", "42.50", "200", "GST on Income"],
      ["Walk-in Customer", "ZB-BBBB1111", "21/11/2026", "21/11/2026", "Counter sale", "1", "12.00", "200", "GST on Income"],
      ["jess@x.com", "ZB-CCCC1111-CR", "23/11/2026", "23/11/2026", "Refund of ZB-CCCC1111", "1", "-10.00", "200", "GST on Income"],
    ]);
  });

  it("uses the shop's own account code and tax rate name, and never credits more than the order", () => {
    const rows = xeroRows([], [{ ...refunded, refunded_amount: 99 }], { timeZone: TZ, accountCode: "210", taxType: "GST Free Income" });
    expect(rows[1]!.slice(6)).toEqual(["-30.00", "210", "GST Free Income"]);
    expect(xeroRows([{ ...sale, total: 0 }], [{ ...refunded, refunded_at: null }], { timeZone: TZ })).toEqual([XERO_HEADER]);
    expect(xeroDate("2026-11-21T13:29:00Z", TZ)).toBe("21/11/2026");
  });
});

describe("the route", () => {
  const sent: Query[] = [];
  beforeEach(() => {
    sent.length = 0;
    h.auth = { ok: true, businessId: "shop-a", userId: "u1", email: "max@a.com", role: "Manager", isSuperAdmin: false };
    h.db = fakeDb({
      "businesses.select": () => ({ data: { settings: { timezone: TZ, xero: { account_code: "205" } } }, error: null }),
      "orders.select": q => { sent.push(q); return { data: filterValue(q, "refunded_amount>") !== undefined ? [refunded] : [sale], error: null }; },
    });
  });

  it("a manager gets the shop's sales and refunds as a CSV Xero can import", async () => {
    const res = await exportXero(new Request("https://dashboard.zentrabite.com/api/export/xero?from=2026-11-01&to=2026-11-23"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("zentrabite-xero-export-2026-11-23.csv");
    const lines = (await res.text()).trim().split("\n");
    expect(lines[0]).toBe(XERO_HEADER.join(","));
    expect(lines[1]).toBe("Sofia Rossi,ZB-AAAA1111,22/11/2026,22/11/2026,Online order,1,42.50,205,GST on Income");
    expect(lines[2]).toBe("jess@x.com,ZB-CCCC1111-CR,23/11/2026,23/11/2026,Refund of ZB-CCCC1111,1,-10.00,205,GST on Income");
    for (const q of sent) expect(filterValue(q, "business_id")).toBe("shop-a");
    expect(filterValue(sent[1]!, "refunded_at>=")).toBe("2026-11-01T00:00:00.000Z");
  });

  it("is for owners and managers, and refuses a bad date", async () => {
    h.auth = { ...h.auth, role: "Staff" };
    expect((await exportXero(new Request("https://dashboard.zentrabite.com/api/export/xero"))).status).toBe(403);
    h.auth = { ...h.auth, role: "Owner" };
    expect((await exportXero(new Request("https://dashboard.zentrabite.com/api/export/xero?from=soon"))).status).toBe(400);
  });
});

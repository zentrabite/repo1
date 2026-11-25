// The limit on checkouts started (migration 040, lib/checkout-limit.ts).

import { describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

vi.mock("server-only", () => ({}));

import { CHECKOUT_LIMITS, checkoutAllowed } from "@/lib/checkout-limit";

const SHOP = "biz-1";
const headers = (ip: string) => new Headers({ "x-real-ip": ip });
const NOW = new Date("2026-11-25T08:00:00Z");

/** A database where the counts come from `count(query)`. */
function world(count: (q: Query) => number) {
  return fakeDb({ "checkout_starts.select": q => ({ data: null, error: null, count: count(q) }) });
}
const inserts = (db: ReturnType<typeof fakeDb>) => (db.calls as Query[]).filter(q => q.table === "checkout_starts" && q.op === "insert");

describe("checkout limit", () => {
  it("lets a checkout through and counts it, keeping only a hash of the address", async () => {
    const db = world(() => 0);
    expect(await checkoutAllowed(db, SHOP, headers("203.0.113.9"), NOW)).toEqual({ ok: true });
    const [row] = inserts(db);
    expect(row!.payload).toMatchObject({ business_id: SHOP });
    const key = (row!.payload as { ip_key: string }).ip_key;
    expect(key).not.toContain("203.0.113");
    expect(key).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("stops one person after 10 checkouts at a shop in 10 minutes", async () => {
    const db = world(q => (filterValue(q, "business_id") && filterValue(q, "ip_key") ? CHECKOUT_LIMITS.personAtShop[0].max : 0));
    expect(await checkoutAllowed(db, SHOP, headers("203.0.113.9"), NOW)).toEqual({ ok: false, retryAfter: 600 });
    expect(inserts(db)).toHaveLength(0);
  });

  it("stops one person across every shop, and a shop flooded by many people", async () => {
    const person = world(q => (filterValue(q, "ip_key") && !filterValue(q, "business_id") ? 60 : 0));
    expect((await checkoutAllowed(person, SHOP, headers("203.0.113.9"), NOW)).ok).toBe(false);
    const shop = world(q => (filterValue(q, "business_id") && !filterValue(q, "ip_key") ? 200 : 0));
    expect((await checkoutAllowed(shop, SHOP, headers("203.0.113.9"), NOW)).ok).toBe(false);
  });

  it("treats a whole IPv6 /64 as one person", async () => {
    const keys: string[] = [];
    const db = fakeDb({ "checkout_starts.insert": q => { keys.push((q.payload as { ip_key: string }).ip_key); return { data: null, error: null }; } });
    await checkoutAllowed(db, SHOP, headers("2001:db8:1:2::1"), NOW);
    await checkoutAllowed(db, SHOP, headers("2001:db8:1:2:ffff::9"), NOW);
    await checkoutAllowed(db, SHOP, headers("2001:db8:1:3::1"), NOW);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("lets the checkout go ahead if the count can't be read", async () => {
    const db = fakeDb({ "checkout_starts.select": () => ({ data: null, error: { message: "down" } }) });
    expect(await checkoutAllowed(db, SHOP, headers("203.0.113.9"), NOW)).toEqual({ ok: true });
  });
});

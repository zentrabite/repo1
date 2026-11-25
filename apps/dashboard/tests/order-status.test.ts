// Found in the test shop run (26 Nov 2026). A row rule that refuses an update
// returns no error, just no rows, so Accept on the Orders page said "Accepted"
// when nothing changed (ZentraBite staff viewing a shop can read its orders but
// not change them). updateOrderStatus now asks for the changed row back and
// throws NotChangedError when there isn't one.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
}));

vi.mock("@/lib/supabase", () => ({ get supabase() { return h.db; } }));

import { NotChangedError, updateOrderStatus } from "@/lib/queries";

const calls = (op: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === "orders" && q.op === op);

describe("changing an order's status from the Orders page", () => {
  beforeEach(() => { h.db = null; });

  it("saves the new status for an order the login may change", async () => {
    h.db = fakeDb({ "orders.update": q => ({ data: [{ id: filterValue(q, "id") }], error: null }) });
    await expect(updateOrderStatus("order-1", "Preparing")).resolves.toBeUndefined();
    expect(calls("update")[0]!.payload).toEqual({ status: "Preparing" });
  });

  it("says so when the database changed nothing", async () => {
    h.db = fakeDb({ "orders.update": () => ({ data: [], error: null }) });
    await expect(updateOrderStatus("order-1", "Preparing")).rejects.toBeInstanceOf(NotChangedError);
  });

  it("passes a database error on", async () => {
    h.db = fakeDb({ "orders.update": () => ({ data: null, error: { message: "boom" } }) });
    await expect(updateOrderStatus("order-1", "Preparing")).rejects.toMatchObject({ message: "boom" });
  });
});

// Tests for bringing in a customer list: reading the CSV, guessing columns,
// phones, emails and dates, who counts as agreed to marketing, and the route
// that saves it. The database and the login check are fakes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { fakeDb, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  auth: null as null | { ok: true; userId: string; email: string; businessId: string; role: string; isSuperAdmin: boolean },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => h.auth ?? { ok: false, response: NextResponse.json({ error: "Not logged in" }, { status: 401 }) }),
}));

import { POST as importCustomers } from "@/app/api/customers/import/route";
import { auPhone, cleanEmail, guessMapping, parseCsv, parseDate, rowsFrom, saysYes } from "@/lib/customer-import";
import { requireBusiness } from "@/lib/request-business";

const BIZ = "biz-1";
const TODAY = new Date("2026-11-20T00:00:00Z");
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const post = (body: object) => importCustomers(new Request("https://dashboard.zentrabite.com/api/customers/import", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = { ok: true, userId: "owner-1", email: "jo@example.com", businessId: BIZ, role: "Owner", isSuperAdmin: false };
  h.db = fakeDb();
});

describe("reading the file", () => {
  it("handles quotes, commas and new lines inside quotes, CRLF and a BOM", () => {
    const rows = parseCsv('\uFEFFName,Phone,Note\r\n"Smith, Jo",0412 345 678,"said ""hi""\nthen left"\r\n\r\nAmy,,\r\n');
    expect(rows).toEqual([["Name", "Phone", "Note"], ["Smith, Jo", "0412 345 678", 'said "hi"\nthen left'], ["Amy", "", ""]]);
  });

  it("reads semicolon files", () => {
    expect(parseCsv("Name;Email\nJo;jo@x.com")).toEqual([["Name", "Email"], ["Jo", "jo@x.com"]]);
  });

  it("guesses the columns from Square, Shopify and Mailchimp style headings", () => {
    expect(guessMapping(["First Name", "Surname", "Email Address", "Phone Number", "Email Subscription Status", "Last Visit"]))
      .toEqual({ first: 0, last: 1, email: 2, phone: 3, consent: 4, last_visit: 5 });
    expect(guessMapping(["Customer", "Mobile", "Accepts Marketing", "Last Order Date"]))
      .toEqual({ name: 0, phone: 1, consent: 2, last_visit: 3 });
    expect(guessMapping(["Name", "Email"])).toEqual({ name: 0, email: 1 });
  });
});

describe("phones, emails, dates and consent", () => {
  it("keeps Australian numbers in +61 form and turns away the rest", () => {
    expect(auPhone("0412 345 678")).toBe("+61412345678");
    expect(auPhone("+61 412 345 678")).toBe("+61412345678");
    expect(auPhone("61412345678")).toBe("+61412345678");
    expect(auPhone("412345678")).toBe("+61412345678");        // a spreadsheet dropped the 0
    expect(auPhone("(08) 8123 4567")).toBe("+61881234567");
    expect(auPhone("1300 123 456")).toBeNull();
    expect(auPhone("+44 20 7946 0958")).toBeNull();
    expect(auPhone("12345")).toBeNull();
  });

  it("checks emails", () => {
    expect(cleanEmail(" Jo@Example.COM ")).toBe("jo@example.com");
    expect(cleanEmail("not an email")).toBeNull();
    expect(cleanEmail("a@b")).toBeNull();
  });

  it("reads Australian dates day first, and nothing in the future", () => {
    expect(parseDate("14/03/2026", TODAY)).toBe("2026-03-14");
    expect(parseDate("4/3/26", TODAY)).toBe("2026-03-04");
    expect(parseDate("2026-03-14 18:20", TODAY)).toBe("2026-03-14");
    expect(parseDate("31/02/2026", TODAY)).toBeNull();
    expect(parseDate("01/01/2027", TODAY)).toBeNull();
    expect(parseDate("last week", TODAY)).toBeNull();
  });

  it("only counts a clear yes as agreed", () => {
    for (const v of ["yes", "Y", "TRUE", "1", "subscribed", "Opted in", "✓"]) expect(saysYes(v)).toBe(true);
    for (const v of ["", "no", "unsubscribed", "pending", "0", "cleaned"]) expect(saysYes(v)).toBe(false);
  });
});

describe("turning rows into customers", () => {
  const table = [
    ["First", "Last", "Mobile", "Email", "Marketing", "Last visit"],
    ["Jo", "Smith", "0412 345 678", "JO@x.com", "yes", "14/03/2026"],
    ["Amy", "", "", "amy@x.com", "no", ""],
    ["Nobody", "", "", "", "yes", ""],
    ["Bad", "", "123", "nope", "", ""],
    ["Jo again", "", "+61412345678", "", "", ""],
    ["", "", "0400 000 001", "", "", ""],
  ];
  it("keeps good rows, says why others were left out, and names people without one", () => {
    const { rows, skipped } = rowsFrom(table, guessMapping(table[0]!), TODAY);
    expect(rows).toEqual([
      { name: "Jo Smith", phone: "+61412345678", email: "jo@x.com", consent: true, last_visit: "2026-03-14" },
      { name: "Amy", phone: null, email: "amy@x.com", consent: false, last_visit: null },
      { name: "Customer", phone: "+61400000001", email: null, consent: false, last_visit: null },
    ]);
    expect(skipped).toEqual([
      { line: 4, reason: "no phone or email" },
      { line: 5, reason: "the phone or email isn't valid" },
      { line: 6, reason: "already in the file" },
    ]);
  });
});

describe("saving the list", () => {
  const jo = { name: "Jo Smith", phone: "+61412345678", email: "jo@x.com", consent: true, last_visit: "2026-03-14" };
  const amy = { name: "Amy", phone: null, email: "amy@x.com", consent: false, last_visit: null };

  it("is for owners and managers, for their own business", async () => {
    h.auth = null;
    expect((await post({ rows: [jo] })).status).toBe(401);
    expect(vi.mocked(requireBusiness).mock.calls[0]).toEqual([null, { roles: ["Owner", "Manager"] }]);
  });

  it("adds new people with marketing on only for those who agreed, once the owner confirms", async () => {
    const res = await post({ rows: [jo, amy], fileName: "square.csv", consentConfirmed: true });
    expect(await res.json()).toMatchObject({ added: 2, updated: 0, optedIn: 1 });
    const [ins] = calls("customers", "insert");
    const saved = ins!.payload as Record<string, unknown>[];
    expect(saved[0]).toMatchObject({ business_id: BIZ, name: "Jo Smith", source: "import", marketing_opt_in: true, marketing_opt_in_source: "import: square.csv", last_order_date: "2026-03-14T12:00:00.000Z" });
    expect(saved[1]).toMatchObject({ name: "Amy", marketing_opt_in: false, marketing_opt_in_at: null, last_order_date: null });
  });

  it("opts nobody in without the owner's confirmation", async () => {
    const res = await post({ rows: [jo], consentConfirmed: false });
    expect((await res.json()).optedIn).toBe(0);
    expect((calls("customers", "insert")[0]!.payload as Record<string, unknown>[])[0]!.marketing_opt_in).toBe(false);
  });

  it("checks every row again and ignores what the browser can't be trusted with", async () => {
    const res = await post({ rows: [{ name: "X", phone: "123", email: "nope" }, { name: "Y", phone: "0412 999 888", consent: "yes", business_id: "other", marketing_opt_in: true }], consentConfirmed: true });
    expect(await res.json()).toMatchObject({ added: 1, invalid: 1, optedIn: 0 });
    const saved = (calls("customers", "insert")[0]!.payload as Record<string, unknown>[])[0]!;
    expect(saved).toMatchObject({ business_id: BIZ, phone: "+61412999888", marketing_opt_in: false });
  });

  it("updates people already in the list instead of adding them twice, and never opts back in someone who opted out", async () => {
    h.db = fakeDb({ "customers.select": () => ({ data: [
      { id: "c1", phone: "0412 345 678", email: null, opted_out: true, marketing_opt_in: false, last_order_date: "2026-01-01T00:00:00Z" },
      { id: "c2", phone: null, email: "AMY@x.com", opted_out: false, marketing_opt_in: false, last_order_date: null },
    ], error: null }) });
    const res = await post({ rows: [jo, { ...amy, phone: "0400 111 222", consent: true }], consentConfirmed: true });
    expect(await res.json()).toMatchObject({ added: 0, updated: 2, optedIn: 1, keptOptedOut: 1 });
    const ups = calls("customers", "update");
    expect(ups[0]!.payload).toEqual({ email: "jo@x.com", last_order_date: "2026-03-14T12:00:00.000Z" });
    expect(ups[0]!.filters).toEqual([["id", "c1"], ["business_id", BIZ]]);
    expect(ups[1]!.payload).toMatchObject({ phone: "+61400111222", marketing_opt_in: true });
    expect(calls("customers", "insert")).toHaveLength(0);
  });

  it("reads the existing list a page at a time", async () => {
    const page = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, phone: null, email: `p${i}@x.com`, opted_out: false, marketing_opt_in: false, last_order_date: null }));
    let n = 0;
    h.db = fakeDb({ "customers.select": () => ({ data: n++ === 0 ? page : [], error: null }) });
    await post({ rows: [amy] });
    expect(calls("customers", "select").map(q => q.filters.find(([c]) => c === "range")?.[1])).toEqual([[0, 999], [1000, 1999]]);
  });

  it("turns away an empty or huge list", async () => {
    expect((await post({ rows: [] })).status).toBe(400);
    expect((await post({ rows: Array.from({ length: 5001 }, () => amy) })).status).toBe(400);
  });
});

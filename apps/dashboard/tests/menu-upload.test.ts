// Tests for reading a menu from photos, a PDF or pasted text: the file checks,
// the read itself (the AI is a fake), the route's limits, and how the menu is
// stored with the shop.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  who: null as null | { userId: string; email: string | null; isSuperAdmin: boolean; isSeller: boolean },
  aiExtract: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => h.db,
  createServerClient: () => h.db,
  createSessionClient: async () => h.db,
}));
vi.mock("@/lib/seller-auth", async () => ({
  ...(await vi.importActual<typeof import("@/lib/seller-auth")>("@/lib/seller-auth")),
  assertSellerOrAdmin: vi.fn(async () => h.who),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: false, skipped: true })) }));
vi.mock("@/lib/import/ai", () => ({ aiExtract: h.aiExtract, IMPORT_MODEL: "test-model" }));

import { POST as menuRead } from "@/app/api/admin/onboarding/menu-read/route";
import { POST as createShop } from "@/app/api/admin/onboarding/route";
import { MENU_UPLOAD, MenuUploadError, readMenuUpload, sortUpload, type UploadFile } from "@/lib/import/menu-upload";
import { toStoredImport, withUploadedMenu } from "@/lib/import/store";
import { SELLER_IMPORTS_PER_DAY } from "@/lib/seller-auth";
import type { MenuRead } from "@/lib/import/types";

const SELLER = { userId: "seller-1", email: "sam@example.com", isSuperAdmin: false, isSeller: true };
const STAFF  = { userId: "staff-1", email: "deon@example.com", isSuperAdmin: true, isSeller: false };

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(200, 1)]);
const file = (name: string, data: Buffer): UploadFile => ({ name, type: "", data });

const AI_MENU = {
  menu: [
    { category: "Pizzas", items: [
      { name: "Margherita", price: 18, description: null, dietary: ["Vegetarian"], variants: [], note: null },
      { name: "Pepperoni", price: null, description: null, dietary: [], variants: [{ name: "Small", price: 16 }, { name: "Large", price: 24 }], note: null },
    ] },
    { category: "Sides", items: [{ name: "Garlic bread", price: 8, description: null, dietary: [], variants: [], note: null }] },
  ],
  menu_truncated: false,
  surcharges: ["10% Sunday surcharge"],
  staff_should_check: ["Two prices for Garlic bread"],
};
const aiReturns = (output: object, stopReason = "tool_use") =>
  h.aiExtract.mockResolvedValue({ output, usage: { input_tokens: 1, output_tokens: 1 }, stopReason });

const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));

beforeEach(() => {
  vi.clearAllMocks();
  h.who = null;
  h.db = fakeDb();
  process.env.ANTHROPIC_API_KEY = "test-key";
  aiReturns(AI_MENU);
});

describe("checking what was sent", () => {
  it("needs a file or some text", () => {
    expect(() => sortUpload([], "  ")).toThrow(/Add a photo or PDF/);
  });

  it("sorts photos and PDFs by what's in them, not their names", () => {
    const r = sortUpload([file("menu.pdf", JPG), file("page2.jpg", PNG), file("menu", PDF)], "");
    expect(r.images.map(i => i.mediaType)).toEqual(["image/jpeg", "image/png"]);
    expect(r.pdfs).toHaveLength(1);
  });

  it("turns away anything that isn't a photo or PDF", () => {
    expect(() => sortUpload([file("menu.jpg", Buffer.from("<html>not a photo</html>"))], "")).toThrow(/isn't a photo or PDF/);
  });

  it("caps the number of files, the total size and the pasted text", () => {
    expect(() => sortUpload(Array.from({ length: MENU_UPLOAD.maxFiles + 1 }, (_, i) => file(`p${i}.jpg`, JPG)), "")).toThrow(/at most/);
    const big = Buffer.concat([JPG, Buffer.alloc(MENU_UPLOAD.maxTotalBytes)]);
    expect(() => sortUpload([file("big.jpg", big)], "")).toThrow(MenuUploadError);
    expect(() => sortUpload([], "x".repeat(MENU_UPLOAD.maxTextChars + 1))).toThrow(/too long/);
  });
});

describe("reading the menu", () => {
  it("sends the photos, PDFs and text to the AI as an upload, and returns a menu draft", async () => {
    const r = await readMenuUpload([file("p1.jpg", JPG), file("menu.pdf", PDF)], "Specials\nCalzone $22", { timeoutMs: 1000 });
    const input = h.aiExtract.mock.calls[0]![0];
    expect(input.source).toBe("upload");
    expect(input.images).toHaveLength(1);
    expect(input.pdfs).toHaveLength(1);
    expect(input.pages[0].text).toContain("Calzone");
    expect(r.items).toBe(3);
    expect(r.menu[0]!.items[1]!.price).toBe(16);            // cheapest size when there's no price
    expect(r.menu[0]!.items[1]!.check).toMatch(/cheapest size/);
    expect(r.check).toMatch(/3 items read from 1 photo, 1 PDF, the pasted text/);
    expect(r.surcharges).toEqual(["10% Sunday surcharge"]);
    expect(r.warnings).toEqual(["Two prices for Garlic bread"]);
    expect(r.read).toEqual({ photos: 1, pdfs: 1, text: true });
  });

  it("says when the menu was cut short", async () => {
    aiReturns({ ...AI_MENU, menu_truncated: true });
    expect((await readMenuUpload([], "menu", { timeoutMs: 1000 })).check).toMatch(/cut short/);
  });

  it("says so when nothing could be read", async () => {
    aiReturns({ ...AI_MENU, menu: [] });
    await expect(readMenuUpload([file("p1.jpg", JPG)], "", { timeoutMs: 1000 })).rejects.toThrow(/straight on, in good light/);
  });

  it("gives a plain message when the AI read fails", async () => {
    h.aiExtract.mockRejectedValue(new Error("AI service error 529"));
    await expect(readMenuUpload([], "menu", { timeoutMs: 1000 })).rejects.toMatchObject({ status: 502 });
  });

  it("doesn't start, or count a run, without an AI key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const onStart = vi.fn();
    await expect(readMenuUpload([], "menu", { timeoutMs: 1000, onStart })).rejects.toMatchObject({ status: 503 });
    expect(onStart).not.toHaveBeenCalled();
    expect(h.aiExtract).not.toHaveBeenCalled();
  });
});

describe("the menu-read route", () => {
  const send = (parts: { files?: { name: string; data: Buffer }[]; text?: string }) => {
    const form = new FormData();
    for (const f of parts.files ?? []) form.append("files", new Blob([new Uint8Array(f.data)]), f.name);
    if (parts.text) form.append("text", parts.text);
    return menuRead(new Request("https://dashboard.zentrabite.com/api/admin/onboarding/menu-read", { method: "POST", body: form }));
  };

  it("is for sellers and staff only", async () => {
    expect((await send({ text: "menu" })).status).toBe(403);
    expect(h.aiExtract).not.toHaveBeenCalled();
  });

  it("reads a seller's photo and counts it as one of their imports", async () => {
    h.who = SELLER;
    h.db = fakeDb({ "import_runs.select": () => ({ data: null, error: null, count: 2 }) });
    const res = await send({ files: [{ name: "menu.jpg", data: JPG }] });
    expect(res.status).toBe(200);
    expect((await res.json()).result.items).toBe(3);
    expect(calls("import_runs", "insert")[0]!.payload).toEqual({ user_id: "seller-1", url: "menu upload: 1 file" });
  });

  it("stops a seller at the daily limit before any AI time is spent", async () => {
    h.who = SELLER;
    h.db = fakeDb({ "import_runs.select": () => ({ data: null, error: null, count: SELLER_IMPORTS_PER_DAY }) });
    const res = await send({ text: "Margherita $18" });
    expect(res.status).toBe(429);
    expect(h.aiExtract).not.toHaveBeenCalled();
    expect(calls("import_runs", "insert")).toHaveLength(0);
  });

  it("doesn't count a read that was turned away for a bad file", async () => {
    h.who = SELLER;
    const res = await send({ files: [{ name: "menu.jpg", data: Buffer.from("not a photo at all") }] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/isn't a photo or PDF/);
    expect(calls("import_runs", "insert")).toHaveLength(0);
  });

  it("needs something to read", async () => {
    h.who = STAFF;
    expect((await send({})).status).toBe(400);
  });

  it("doesn't limit staff", async () => {
    h.who = STAFF;
    expect((await send({ text: "Margherita $18" })).status).toBe(200);
    expect(calls("import_runs", "select")).toHaveLength(0);
  });
});

describe("keeping the menu with the shop", () => {
  const read: MenuRead = {
    menu: [{ name: "Pizzas", items: [{ name: "Margherita", price: 18, description: null, dietary_tags: [], variants: [], check: null }] }],
    items: 1,
    check: "1 items read from 1 photo. Check every price with the owner.",
    surcharges: ["10% Sunday surcharge"],
    warnings: ["Faint prices on page 2"],
    read: { photos: 1, pdfs: 0, text: false },
  };
  const site = toStoredImport({
    source_url: "https://joespizza.com.au",
    final_url: "https://joespizza.com.au/",
    menu: { value: [{ name: "Old menu", items: [{ name: "Old pizza", price: 12 }] }], check: "From the website" },
    warnings: ["Website warning"],
    surcharges: { value: ["Card fee 1.5%"] },
  }, "staff-1")!;

  it("replaces the website's menu with the owner's", () => {
    const s = withUploadedMenu(site, read, "seller-1")!;
    expect(s.menu![0]!.name).toBe("Pizzas");
    expect(s.menu_from).toBe("upload");
    expect(s.checks.menu).toBe(read.check);
    expect(s.source_url).toBe("https://joespizza.com.au/");
    expect(s.surcharges).toEqual(["10% Sunday surcharge"]);
    expect(s.warnings).toEqual(["Website warning", "Faint prices on page 2"]);
  });

  it("makes a menu-only import when there was no website", () => {
    const s = withUploadedMenu(null, read, "seller-1")!;
    expect(s).toMatchObject({ source_url: "", menu_from: "upload", photos: [], logo_candidates: [], hours: null });
    expect(s.permission.confirmed_by).toBe("seller-1");
  });

  it("cleans what the browser sent, and ignores an empty menu", () => {
    expect(withUploadedMenu(site, { menu: [] }, "x")).toBe(site);
    expect(withUploadedMenu(null, { menu: "nope" }, "x")).toBeNull();
    const s = withUploadedMenu(null, { menu: [{ name: "A", items: [{ name: "Pie", price: "free" }, { price: 3 }] }] }, "x")!;
    expect(s.menu![0]!.items).toEqual([expect.objectContaining({ name: "Pie", price: null })]);
  });

  it("is saved on the new shop from the handover form", async () => {
    h.who = SELLER;
    h.db = Object.assign(fakeDb({
      "businesses.insert": q => ({ data: { id: "biz-1", ...(q.payload as object) }, error: null }),
      "businesses.select": () => ({ data: null, error: null, count: 0 }),
    }), { auth: { getUser: async () => ({ data: { user: { id: "seller-1" } } }) } });
    const res = await createShop(new Request("https://dashboard.zentrabite.com/api/admin/onboarding", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Joe's Pizza", ownerEmail: "joe@example.com", ownerPhone: "0412 345 678", abn: "51 824 753 556", menuUpload: read }),
    }));
    expect(res.status).toBe(200);
    const saved = calls("businesses", "insert")[0]!.payload as { settings: { import: { menu_from: string; menu: unknown[] } }; website: string | null };
    expect(saved.settings.import.menu_from).toBe("upload");
    expect(saved.settings.import.menu).toHaveLength(1);
    expect(saved.website).toBeNull();
  });
});

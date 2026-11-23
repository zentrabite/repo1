// Which photos a shop's website shows (lib/site.ts). The owner's own photos
// first, then stock photos of food for a food business, and none for anyone
// else. Stock photos are our own copies in public/site-stock.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => null }));

import { buildSite, stockPhotos, stockSet, type SiteItem, type SiteRow, type StockSet } from "@/lib/site";

function shop(over: Partial<SiteRow> = {}): SiteRow {
  return {
    id: "b1", name: "Corner Shop", type: "restaurant", suburb: "Norwood", subdomain: "corner",
    logo_url: null, description: null, contact_phone: null, address: null,
    settings: {}, stripe_account_id: null, stripe_charges_enabled: null, ...over,
  };
}
const item = (name: string): SiteItem => ({ id: name, name, price: 12, description: null, category_id: null, sort_order: 0 });

describe("a shop's website photos", () => {
  it("uses the owner's photos when there are any", () => {
    const site = buildSite(shop({ settings: { site: { photos: ["https://example.com/a.jpg", "http://example.com/b.jpg"] } } }), [], [item("Margherita pizza")], 0);
    expect(site.photos).toEqual([{ url: "https://example.com/a.jpg", alt: "Corner Shop", stock: false }]);
  });

  it("picks stock photos from the menu and the cuisine", () => {
    expect(buildSite(shop(), [], [item("Margherita pizza")], 0).photos[0]!.url).toBe("/site-stock/pizza-board.webp");
    expect(buildSite(shop({ type: "cafe" }), [], [item("Banana bread")], 0).photos[0]!.url).toBe("/site-stock/cafe-coffees.webp");
    expect(buildSite(shop({ settings: { import: { cuisine: "Thai" } } }), [], [item("Pad see ew")], 0).photos[0]!.url).toBe("/site-stock/asian-curry.webp");
  });

  it("gives any other food business plain food photos, never a dining room", () => {
    const site = buildSite(shop({ type: "food_truck" }), [], [item("Souvlaki")], 0);
    expect(site.photos.map(p => p.url)).toEqual(["/site-stock/pizza-ingredients.webp", "/site-stock/food-plate.webp", "/site-stock/food-table.webp"]);
    expect(site.photos.every(p => p.stock)).toBe(true);
  });

  it("gives shops, salons, gyms and trades no stock photos", () => {
    for (const type of ["retail", "salon", "gym", "service"]) {
      expect(buildSite(shop({ type, name: "Coffee Cuts" }), [], [], 0).photos).toEqual([]);
    }
  });

  it("gives an unknown business no stock photos unless it looks like food", () => {
    expect(stockSet("other", "Bright Sparks Electrical", null)).toBeNull();
    expect(stockSet(null, "Bright Sparks Electrical", null)).toBeNull();
    expect(stockSet("other", "Luigi's pizza", null)).toBe("pizza");
    expect(stockSet(null, "Luigi's", "Italian")).toBe("food");
  });

  it("has a file for every stock photo", () => {
    const sets: StockSet[] = ["pizza", "asian", "cafe", "burger", "food"];
    for (const set of sets) {
      for (const p of stockPhotos(set)) {
        expect(existsSync(join(__dirname, "..", "public", p.url))).toBe(true);
        expect(p.alt).not.toMatch(/dining room|counter|shopfront/i);
      }
    }
  });
});

// ─── The owner's own photos, copied into our storage (lib/site-photos.ts) ────

const fetched = vi.hoisted(() => ({ bodies: new Map<string, Buffer>() }));
vi.mock("@/lib/import/safe-fetch", () => ({
  safeFetch: async (url: string) => {
    const body = fetched.bodies.get(url);
    if (!body) throw new Error("unreachable");
    return { url, status: 200, contentType: "image/jpeg", body, truncated: false };
  },
}));

import { planPhotos, savePhotos } from "@/lib/site-photos";

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const found = (...urls: string[]) => ({ import: { photos: urls.map(url => ({ url })) } });

function fakeStorage() {
  const uploads: string[] = [];
  return {
    uploads,
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => { uploads.push(`${bucket}/${path}`); return { error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://db.example/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  };
}

describe("the owner's own photos", () => {
  it("only takes photos the import found for this shop", () => {
    expect(planPhotos(found("https://old.site/a.jpg"), ["https://evil.example/x.jpg"])).toEqual({ ok: false, error: "That photo wasn't found by the import for this business" });
    expect(planPhotos(found(), "https://old.site/a.jpg")).toMatchObject({ ok: false });
    const nine = Array.from({ length: 9 }, (_, i) => `https://old.site/${i}.jpg`);
    expect(planPhotos(found(...nine), nine)).toMatchObject({ ok: false });
  });

  it("copies each ticked photo into our storage and records who ticked them", async () => {
    fetched.bodies.set("https://old.site/a.jpg", JPG);
    const db = fakeStorage();
    const now = new Date("2026-11-23T05:00:00Z");
    const saved = await savePhotos(db, "b1", found("https://old.site/a.jpg"), ["https://old.site/a.jpg"], "staff@zentrabite.com", now);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.failed).toBe(0);
    expect(db.uploads).toHaveLength(1);
    expect(db.uploads[0]).toMatch(/^menu-images\/site\/b1\/[0-9a-f]{24}\.jpg$/);
    expect(saved.site.photos).toEqual(["https://old.site/a.jpg"]);
    expect(saved.site.photo_copies["https://old.site/a.jpg"]).toMatch(/^https:\/\/db\.example\/.*\/site\/b1\//);
    expect(saved.site.photos_confirmed).toEqual({ by: "staff@zentrabite.com", at: now.toISOString() });
  });

  it("doesn't copy again, drops unticked copies, and keeps the confirmation when nothing changed", async () => {
    const settings = { ...found("https://old.site/a.jpg", "https://old.site/b.jpg"), site: {
      photos: ["https://old.site/a.jpg", "https://old.site/b.jpg"],
      photo_copies: { "https://old.site/a.jpg": "https://db.example/a.jpg", "https://old.site/b.jpg": "https://db.example/b.jpg" },
      photos_confirmed: { by: "first@zentrabite.com", at: "2026-11-01T00:00:00Z" },
    } };
    const db = fakeStorage();
    const same = await savePhotos(db, "b1", settings, ["https://old.site/a.jpg", "https://old.site/b.jpg"], "second@zentrabite.com");
    expect(same.ok && same.site.photos_confirmed).toBeUndefined();
    const fewer = await savePhotos(db, "b1", settings, ["https://old.site/b.jpg"], "second@zentrabite.com");
    expect(fewer.ok && fewer.site.photo_copies).toEqual({ "https://old.site/b.jpg": "https://db.example/b.jpg" });
    expect(fewer.ok && fewer.site.photos_confirmed).toMatchObject({ by: "second@zentrabite.com" });
    expect(db.uploads).toHaveLength(0);
  });

  it("refuses an SVG and leaves a photo it can't reach linked, and says how many", async () => {
    fetched.bodies.set("https://old.site/logo.svg", SVG);
    const db = fakeStorage();
    const saved = await savePhotos(db, "b1", found("https://old.site/logo.svg", "https://old.site/gone.jpg"), ["https://old.site/logo.svg", "https://old.site/gone.jpg"], "staff@zentrabite.com");
    expect(saved.ok && saved.failed).toBe(2);
    expect(saved.ok && saved.site.photo_copies).toEqual({});
    expect(db.uploads).toHaveLength(0);
  });

  it("shows our copy on the site, or the old address when there's no copy", () => {
    const site = buildSite(shop({ settings: { site: {
      photos: ["https://old.site/a.jpg", "https://old.site/b.jpg"],
      photo_copies: { "https://old.site/a.jpg": "https://db.example/a.jpg" },
    } } }), [], [], 0);
    expect(site.photos.map(p => p.url)).toEqual(["https://db.example/a.jpg", "https://old.site/b.jpg"]);
  });
});

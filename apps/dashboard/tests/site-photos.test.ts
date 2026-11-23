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

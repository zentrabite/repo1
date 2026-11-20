// Tests for delivery by the shop's own drivers (lib/own-delivery.ts).

import { describe, expect, it } from "vitest";
import { checkDeliveryAddress, cleanNote, parseAreas, readDeliveryRules } from "@/lib/own-delivery";

const rules = readDeliveryRules({ ordering: { delivery: { enabled: true, fee: 6, min_order: 25, extra_minutes: 15, areas: "Norwood, Kent Town\n5067" } } });

describe("reading the delivery rules", () => {
  it("reads what Settings saves", () => {
    expect(rules).toEqual({ enabled: true, fee: 6, minOrder: 25, extraMinutes: 15, areas: ["norwood", "kent town", "5067"] });
  });

  it("stays off with no areas, and when nothing is saved", () => {
    expect(readDeliveryRules({ ordering: { delivery: { enabled: true, areas: "" } } }).enabled).toBe(false);
    expect(readDeliveryRules(null)).toEqual({ enabled: false, fee: 0, minOrder: 0, extraMinutes: 20, areas: [] });
  });

  it("ignores odd numbers", () => {
    expect(readDeliveryRules({ ordering: { delivery: { fee: -5, min_order: "lots", extra_minutes: 999 } } }))
      .toMatchObject({ fee: 0, minOrder: 0, extraMinutes: 20 });
  });

  it("tidies the area list", () => {
    expect(parseAreas(" Norwood ;norwood,  St  Peters ")).toEqual(["norwood", "st peters"]);
    expect(parseAreas(["5067", 42, "5067"])).toEqual(["5067"]);
  });
});

describe("checking a delivery address", () => {
  it("accepts a suburb or a postcode the shop lists", () => {
    expect(checkDeliveryAddress(rules, { line1: "12 Basil Lane", suburb: "Kent Town", postcode: "5071" }))
      .toEqual({ ok: true, address: { line1: "12 Basil Lane", suburb: "Kent Town", postcode: "5071" }, text: "12 Basil Lane, Kent Town 5071" });
    expect(checkDeliveryAddress(rules, { line1: "3 Rose St", suburb: "Rose Park", postcode: "5067" }).ok).toBe(true);
  });

  it("refuses somewhere the shop doesn't deliver", () => {
    expect(checkDeliveryAddress(rules, { line1: "1 Beach Rd", suburb: "Glenelg", postcode: "5045" }))
      .toEqual({ ok: false, error: "Sorry, we don't deliver to Glenelg yet. You can still pick it up." });
  });

  it("needs a street, a suburb and a 4-digit postcode", () => {
    expect(checkDeliveryAddress(rules, { suburb: "Norwood", postcode: "5067" }).ok).toBe(false);
    expect(checkDeliveryAddress(rules, { line1: "12 Basil Lane", suburb: "Norwood", postcode: "506" }).ok).toBe(false);
    expect(checkDeliveryAddress(rules, "Norwood").ok).toBe(false);
  });
});

describe("the order note", () => {
  it("keeps it to one line of 300 characters", () => {
    expect(cleanNote("  No onions\nplease  ")).toBe("No onions please");
    expect(cleanNote("x".repeat(400))).toHaveLength(300);
    expect(cleanNote(42)).toBe("");
  });
});

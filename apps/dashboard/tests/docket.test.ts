// Tests for the kitchen docket (lib/docket.ts).

import { describe, expect, it } from "vitest";
import { docketHtml } from "@/lib/docket";

const order = {
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  created_at: "2026-11-20T07:35:00.000Z",          // 6:05pm in Adelaide
  items: [
    { name: "Margherita", qty: 2, price: 24.5, options: [{ name: "Large" }, { name: "Olives" }] },
    { name: "Garlic bread", qty: 1, price: 8 },
  ],
  total: 63,
  source: "direct",
  fulfillment_type: "delivery",
  pickup_at: "2026-11-20T08:00:00.000Z",           // 6:30pm
  pickup_asap: true,
  notes: "Ring the bell <twice>",
  ship_to: { address: "12 Basil Lane, Norwood 5067" },
  delivery_fee: 6,
};

describe("the kitchen docket", () => {
  const html = docketHtml({ order, businessName: "Nonna's Kitchen", timezone: "Australia/Adelaide", customer: { name: "Sofia", phone: "0412 345 678" } });

  it("leads with how and when, in the shop's time", () => {
    expect(html).toContain('<div class="kind">DELIVERY</div>');
    expect(html).toContain('<div class="when">ASAP 6:30pm</div>');
    expect(html).toContain("placed 6:05pm");
  });

  it("lists the items with their options and line totals", () => {
    expect(html).toContain("<b>2 &times;</b> Margherita</span><span>$49.00</span>");
    expect(html).toContain('<div class="opts">Large, Olives</div>');
    expect(html).toContain("<b>1 &times;</b> Garlic bread</span><span>$8.00</span>");
  });

  it("shows the customer, the address, the note and the total", () => {
    expect(html).toContain("Sofia &middot; 0412 345 678");
    expect(html).toContain("12 Basil Lane, Norwood 5067");
    expect(html).toContain("NOTE: Ring the bell &lt;twice&gt;");
    expect(html).toContain("<span>Total</span><span>$63.00</span>");
    expect(html).toContain("Paid online");
  });

  it("escapes anything a customer typed", () => {
    const evil = docketHtml({ order: { ...order, notes: "<script>alert(1)</script>" }, businessName: "<b>Shop</b>", timezone: "Australia/Adelaide" });
    expect(evil).not.toContain("<script>");
    expect(evil).toContain("&lt;b&gt;Shop&lt;/b&gt;");
  });

  it("says pick-up for a pick-up order and leaves out what it doesn't have", () => {
    const pick = docketHtml({ order: { ...order, fulfillment_type: "pickup", pickup_asap: false, notes: null, ship_to: null }, businessName: "Nonna's Kitchen", timezone: "Australia/Adelaide" });
    expect(pick).toContain('<div class="kind">PICK-UP</div>');
    expect(pick).toContain('<div class="when">6:30pm</div>');
    expect(pick).not.toContain("NOTE:");
    expect(pick).not.toContain("Deliver to");
  });
});

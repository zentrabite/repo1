// The allergen note on ordering pages and shop websites (lib/allergens.ts).

import { describe, expect, it } from "vitest";
import { allergenNote } from "@/lib/allergens";

describe("the allergen note", () => {
  it("sends people with an allergy to the shop, with a number to tap", () => {
    const n = allergenNote("Nonna's Kitchen", "(08) 5550 1288");
    expect(n.menu).toMatch(/^Food allergy\?/);
    expect(n.menu).toMatch(/peanuts.*sesame.*shellfish/);
    expect(n.ask).toBe("Call Nonna's Kitchen on (08) 5550 1288");
    expect(n.tel).toBe("tel:0855501288");
  });

  it("still says ask the shop when there's no number or name", () => {
    expect(allergenNote("Nonna's Kitchen", null)).toMatchObject({ ask: "Ask Nonna's Kitchen", tel: null });
    expect(allergenNote(null, "  ")).toMatchObject({ ask: "Ask the shop", tel: null });
  });
});

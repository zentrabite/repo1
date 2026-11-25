// Alcohol stays off the ordering page until ZentraBite turns it on for a
// shop (lib/alcohol.ts, migration 042).

import { describe, expect, it } from "vitest";
import { alcoholAllowed, alcoholLicence, looksLikeAlcohol, onlineOk } from "@/lib/alcohol";

describe("spotting alcohol on a menu", () => {
  it("ticks drinks with alcohol", () => {
    for (const name of ["Peroni Lager", "Pale Ale", "House red wine", "Glass of rosé", "Gin & tonic", "Aperol Spritz", "Margarita", "Pinot gris", "Coopers Pale (stubby)", "Jug of sangria", "Corona six-pack", "Whiskey sour"]) {
      expect(looksLikeAlcohol(name), name).toBe(true);
    }
  });

  it("leaves food and soft drinks alone", () => {
    for (const name of ["Margherita pizza", "Ginger beer", "Ginger chicken", "Rose petal tea", "Rump steak", "Kale salad", "Coke", "Garlic bread", "Mocktail spritz", "Alcohol-free beer", "Beer battered fish", "Vodka pasta", "Rum and raisin ice cream", "Beef braised in red wine", "Tiramisu", "Port Lincoln prawns"]) {
      expect(looksLikeAlcohol(name), name).toBe(false);
    }
  });

  it("reads the description too", () => {
    expect(looksLikeAlcohol("Happy hour special", "A pint of the house lager")).toBe(true);
    expect(looksLikeAlcohol("Fish and chips", "In a crisp beer batter")).toBe(false);
  });
});

describe("whether a shop sells it online", () => {
  const allowed = { alcohol: { allowed: true, licence: "57512345", by: "staff@zentrabite.com", at: "2026-11-25T05:00:00Z" } };

  it("is off until a super admin turns it on", () => {
    expect(alcoholAllowed({})).toBe(false);
    expect(alcoholAllowed(null)).toBe(false);
    expect(alcoholAllowed({ alcohol: { allowed: "yes" } })).toBe(false);
    expect(alcoholAllowed(allowed)).toBe(true);
    expect(alcoholLicence(allowed)).toBe("57512345");
    expect(alcoholLicence({})).toBeNull();
  });

  it("hides only the items that contain alcohol", () => {
    expect(onlineOk({ contains_alcohol: true }, {})).toBe(false);
    expect(onlineOk({ contains_alcohol: true }, allowed)).toBe(true);
    expect(onlineOk({ contains_alcohol: false }, {})).toBe(true);
    expect(onlineOk({}, {})).toBe(true);
  });
});

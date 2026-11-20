// Tests for menu options (lib/menu-options.ts): reading what's saved, pricing
// what a customer picked, and the picker's tap rules.

import { describe, expect, it } from "vitest";
import {
  cheapestPrice, groupRule, lineKey, optionsLabel, priceSelection, pricesVary,
  readOptions, sizesFromVariants, toggleChoice, type OptionGroup,
} from "@/lib/menu-options";

const SIZE: OptionGroup = {
  id: "g-size", name: "Size", min: 1, max: 1, choices: [
    { id: "small", name: "Small", price: 0, available: true },
    { id: "large", name: "Large", price: 4.5, available: true },
    { id: "family", name: "Family", price: 9, available: false },
  ],
};
const EXTRAS: OptionGroup = {
  id: "g-extras", name: "Extras", min: 0, max: 2, choices: [
    { id: "cheese", name: "Extra cheese", price: 2, available: true },
    { id: "olives", name: "Olives", price: 1.5, available: true },
    { id: "chilli", name: "Chilli", price: 0, available: true },
  ],
};
const GROUPS = [SIZE, EXTRAS];

describe("reading saved options", () => {
  it("keeps good groups as they are", () => {
    expect(readOptions(GROUPS)).toEqual(GROUPS);
  });

  it("drops anything malformed instead of trusting it", () => {
    const groups = readOptions([
      "not a group",
      { id: "g1", name: "", choices: [{ id: "c1", name: "A", price: 1 }] },         // no name
      { id: "g2", name: "Empty", choices: [] },                                       // no choices
      { id: "g3", name: "Sauce", min: 5, max: 9, choices: [
        { id: "c2", name: "BBQ", price: "0.5" },
        { id: "c3", name: "Mayo", price: -2 },                                        // negative price
        { id: "c2", name: "Copy", price: 0 },                                         // id used twice
        { id: "c4", name: "Aioli", price: 1, available: false },
      ] },
    ]);
    expect(groups).toEqual([{
      id: "g3", name: "Sauce", min: 2, max: 2, choices: [
        { id: "c2", name: "BBQ", price: 0.5, available: true },
        { id: "c4", name: "Aioli", price: 1, available: false },
      ],
    }]);
  });

  it("treats a missing or odd value as no options", () => {
    expect(readOptions(null)).toEqual([]);
    expect(readOptions({})).toEqual([]);
    expect(readOptions(undefined)).toEqual([]);
  });
});

describe("pricing what was picked", () => {
  it("adds each choice to the item's price, in whole cents", () => {
    const r = priceSelection(18.5, GROUPS, ["large", "cheese", "olives"]);
    expect(r).toEqual({
      ok: true,
      unitPrice: 26.5,
      chosen: [
        { group: "Size", name: "Large", price: 4.5 },
        { group: "Extras", name: "Extra cheese", price: 2 },
        { group: "Extras", name: "Olives", price: 1.5 },
      ],
      choiceIds: ["large", "cheese", "olives"],
    });
    expect(priceSelection(0.1, [{ ...EXTRAS, min: 0, max: 3 }], ["cheese", "olives", "chilli"])).toMatchObject({ ok: true, unitPrice: 3.6 });
  });

  it("puts choices in menu order whatever order they were tapped", () => {
    const a = priceSelection(10, GROUPS, ["olives", "large"]);
    const b = priceSelection(10, GROUPS, ["large", "olives"]);
    expect(a.ok && a.choiceIds).toEqual(["large", "olives"]);
    expect(a).toEqual(b);
  });

  it("refuses a missing required choice", () => {
    expect(priceSelection(10, GROUPS, ["cheese"])).toEqual({ ok: false, error: "Please choose size." });
    expect(priceSelection(10, GROUPS, undefined)).toMatchObject({ ok: false });
  });

  it("refuses too many picks in a group", () => {
    expect(priceSelection(10, GROUPS, ["small", "large"])).toMatchObject({ ok: false });
    expect(priceSelection(10, GROUPS, ["small", "cheese", "olives", "chilli"])).toMatchObject({ ok: false });
  });

  it("refuses a sold-out choice", () => {
    expect(priceSelection(10, GROUPS, ["family"])).toEqual({ ok: false, error: "Family is sold out. Please choose something else." });
  });

  it("refuses a choice that isn't on the item, or a doubled one", () => {
    expect(priceSelection(10, GROUPS, ["small", "gold-leaf"])).toMatchObject({ ok: false });
    expect(priceSelection(10, GROUPS, ["small", "cheese", "cheese"])).toMatchObject({ ok: false });
    expect(priceSelection(10, GROUPS, "small")).toMatchObject({ ok: false });
    expect(priceSelection(10, GROUPS, [42])).toMatchObject({ ok: false });
  });

  it("prices an item with no options at its own price", () => {
    expect(priceSelection(12, [], [])).toEqual({ ok: true, unitPrice: 12, chosen: [], choiceIds: [] });
    expect(priceSelection(12, [], ["anything"])).toMatchObject({ ok: false });
  });
});

describe("cart lines and labels", () => {
  it("gives the same picks the same line whatever the order", () => {
    expect(lineKey("m1", ["olives", "large"])).toBe(lineKey("m1", ["large", "olives"]));
    expect(lineKey("m1", ["large"])).not.toBe(lineKey("m1", ["small"]));
    expect(lineKey("m1", [])).toBe("m1");
  });

  it("names the picks", () => {
    expect(optionsLabel([{ name: "Large" }, { name: "Extra cheese" }])).toBe("Large, Extra cheese");
    expect(optionsLabel(undefined)).toBe("");
  });

  it("says what each group needs", () => {
    expect(groupRule({ min: 1, max: 1 })).toBe("Required · pick 1");
    expect(groupRule({ min: 0, max: 1 })).toBe("Optional · pick 1");
    expect(groupRule({ min: 0, max: 3 })).toBe("Optional · up to 3");
    expect(groupRule({ min: 1, max: 3 })).toBe("Required · pick 1 to 3");
  });

  it("shows the lowest price an item can be ordered at", () => {
    const sizes: OptionGroup = { ...SIZE, choices: [{ id: "r", name: "Regular", price: 2, available: true }, { id: "l", name: "Large", price: 4, available: true }] };
    expect(cheapestPrice(10, [sizes, EXTRAS])).toBe(12);
    expect(pricesVary([sizes])).toBe(true);
    expect(pricesVary([{ ...EXTRAS, choices: [{ id: "x", name: "No onion", price: 0, available: true }] }])).toBe(false);
  });
});

describe("tapping choices", () => {
  it("swaps the choice in a pick-one group", () => {
    expect(toggleChoice(GROUPS, ["small"], "large")).toEqual(["large"]);
    expect(toggleChoice(GROUPS, ["small", "cheese"], "large")).toEqual(["cheese", "large"]);
  });

  it("adds and removes in a pick-many group, and stops when it's full", () => {
    expect(toggleChoice(GROUPS, [], "cheese")).toEqual(["cheese"]);
    expect(toggleChoice(GROUPS, ["cheese"], "cheese")).toEqual([]);
    expect(toggleChoice(GROUPS, ["cheese", "olives"], "chilli")).toEqual(["cheese", "olives"]);
  });

  it("won't pick a sold-out choice", () => {
    expect(toggleChoice(GROUPS, ["small"], "family")).toEqual(["small"]);
  });
});

describe("sizes from the website import", () => {
  it("makes a required Size group priced from the smallest size", () => {
    const r = sizesFromVariants([{ name: "Small", price: 12 }, { name: "Large", price: 16.5 }, { name: "Family", price: 22 }]);
    expect(r?.basePrice).toBe(12);
    expect(r?.group).toMatchObject({ name: "Size", min: 1, max: 1 });
    expect(r?.group.choices.map(c => [c.name, c.price])).toEqual([["Small", 0], ["Large", 4.5], ["Family", 10]]);
    // The group it makes reads back the same, so it can be saved as is.
    expect(readOptions([r?.group])).toEqual([r?.group]);
  });

  it("leaves a single size alone", () => {
    expect(sizesFromVariants([{ name: "Large", price: 16 }])).toBeNull();
    expect(sizesFromVariants(undefined)).toBeNull();
  });
});

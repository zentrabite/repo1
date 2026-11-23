// ─── The allergen note on a shop's ordering page and website ────────────────
// The plan's "Allergen note". The shop knows what's in its food, and
// ZentraBite doesn't, so every ordering page and website menu sends anyone
// with a food allergy to the shop before they order. A note typed into the
// order isn't a check, so the checkout says that too.
// No server-only import, so the pages use it.

const ALLERGENS = "peanuts, tree nuts, sesame, milk, egg, wheat, soy, fish and shellfish";

export type AllergenNote = {
  /** "Food allergy? ..." for under the menu. */
  menu: string;
  /** "Call Nonna's Kitchen on (08) 5550 1288" or "Ask Nonna's Kitchen". */
  ask: string;
  /** For a tap-to-call link, when there's a phone number. */
  tel: string | null;
};

export function allergenNote(shopName: string | null | undefined, phone: string | null | undefined): AllergenNote {
  const who = shopName?.trim() || "the shop";
  const number = phone?.trim() || null;
  const tel = number ? `tel:${number.replace(/[^\d+]/g, "")}` : null;
  return {
    menu: `Food allergy? Any dish may contain or have touched common allergens, like ${ALLERGENS}.`,
    ask: number ? `Call ${who} on ${number}` : `Ask ${who}`,
    tel: tel && tel.length > 6 ? tel : null,
  };
}

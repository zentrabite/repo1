// Alcohol on the ordering page (migration 042).
//
// The draft terms (9.4) and acceptable use policy (4.3) say a business may
// only sell alcohol online once it holds the right liquor licence and
// ZentraBite has turned alcohol on for it. Until then, items marked as
// containing alcohol stay on the POS, where staff can check ID, but are
// hidden from the ordering page and website, and checkout refuses them.
// Once a super admin allows it, the customer ticks that they're 18 or over.
//
// Pure, so the Menu page, the ordering page and the server agree.

/** settings.alcohol, set only by the server for a super admin. */
export type AlcoholSetting = { allowed: true; licence: string; by: string; at: string };

export function alcoholAllowed(settings: unknown): boolean {
  const a = (settings as { alcohol?: { allowed?: unknown } } | null | undefined)?.alcohol;
  return a?.allowed === true;
}

export function alcoholLicence(settings: unknown): string | null {
  const a = (settings as { alcohol?: { allowed?: unknown; licence?: unknown } } | null | undefined)?.alcohol;
  return a?.allowed === true && typeof a.licence === "string" ? a.licence : null;
}

// Drinks without alcohol that share a word with ones that have it, and food
// cooked with it (beer batter, vodka pasta, rum and raisin ice cream), which
// isn't sold as liquor.
const NOT_ALCOHOL = /\b(ginger beer|ginger ale|root beer|non[- ]?alcoholic|alcohol[- ]?free|zero alcohol|no alcohol|0\.0 ?%|mocktails?|virgin|batter(?:ed)?|braised|marinated|glazed?|sauce|pasta|penne|risotto|ice cream|gelato|cake|tiramisu|trifle|pudding|chocolates?|truffles?)\b/i;

// Words that mean the item is, or contains, alcohol. "Port" and a plain
// "rose" are left out because they're also places and flowers, so rosé
// needs its accent or the word wine.
const ALCOHOL = /\b(?:beers?|lagers?|ales?|ipa|stouts?|pilsners?|ciders?|wines?|shiraz|merlot|cabernet|chardonnay|sauvignon|pinot|riesling|moscato|prosecco|champagne|spirits?|vodka|gin|rum|whisk(?:e)?y|bourbon|scotch|tequila|mezcal|liqueurs?|cocktails?|spritz|aperol|sangria|mimosa|margaritas?|negroni|mojito|sake|soju|alcohol|alcoholic|schooner|pint|stubby|six[- ]pack)\b|\brosé/i;

/**
 * Whether an item's name or description reads like it contains alcohol. Only
 * a suggestion: the Menu page ticks the box and the owner can untick it.
 */
export function looksLikeAlcohol(name: string, description?: string | null): boolean {
  const text = `${name ?? ""} ${description ?? ""}`;
  if (NOT_ALCOHOL.test(text)) return false;
  return ALCOHOL.test(text);
}

/** Whether an item can be ordered online at this shop. */
export function onlineOk(item: { contains_alcohol?: boolean | null }, settings: unknown): boolean {
  return !item.contains_alcohol || alcoholAllowed(settings);
}

export const ALCOHOL_HIDDEN_NOTE = "Hidden from your ordering page and website until ZentraBite turns alcohol on for your shop. Email hello@zentrabite.com with your liquor licence.";
export const OVER_18_LABEL = "I'm 18 or over. I'll show ID when I pick up or receive the order.";

// ─── Website import: shared types ────────────────────────────────────────────
// Used by the import API (server) and the onboarding wizard (client), so this
// file must not import anything server-only.
//
// Every imported value carries where it came from and how sure we are. Staff
// see a "Check this" label on anything with a `check` note before it is used.

export type Confidence = "high" | "medium" | "low" | "none";

export type ImportField<T> = {
  value:      T | null;
  source:     string | null;   // e.g. "JSON-LD", "home page text", "menu PDF (AI read)"
  quote?:     string | null;   // the line on their site this came from, when we have it
  confidence: Confidence;
  check?:     string | null;   // why staff must check it; null/undefined = looks fine
};

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Same shape as businesses.settings.hours. One open/close per day. */
export type DayHours = { open: string; close: string; closed: boolean };
export type Session  = { open: string; close: string; label?: string };

export type ImportedHours = {
  week:     Record<DayKey, DayHours>;
  /** Full detail, including split lunch/dinner sessions the week view can't hold. */
  sessions: Partial<Record<DayKey, Session[]>>;
  notes?:   string | null;
};

export type ImportedMenuItem = {
  name:          string;
  price:         number | null;
  description?:  string | null;
  dietary_tags?: string[];
  variants?:     { name: string; price: number }[];
  check?:        string | null;
};

export type ImportedMenuCategory = { name: string; items: ImportedMenuItem[] };

export type ImportedLocation = {
  name?:     string | null;
  address:   string;
  suburb?:   string | null;
  postcode?: string | null;
  phone?:    string | null;
};

export type ImportedLink = { name: string; url: string };

export type ImportResult = {
  source_url:  string;
  final_url:   string;
  fetched_at:  string;
  platform:    string | null;
  pages_read:  { url: string; kind: "home" | "menu" | "contact" | "pdf" | "image"; chars: number }[];
  ai:          { used: boolean; model?: string; error?: string; input_tokens?: number; output_tokens?: number };
  warnings:    string[];

  name:        ImportField<string>;
  type:        ImportField<string>;   // one of BUSINESS_TYPES
  cuisine:     ImportField<string>;
  tagline:     ImportField<string>;
  description: ImportField<string>;
  phone:       ImportField<string>;
  email:       ImportField<string>;
  address:     ImportField<string>;
  suburb:      ImportField<string>;
  locations:   ImportField<ImportedLocation[]>;
  hours:       ImportField<ImportedHours>;
  logo:        ImportField<string>;
  logo_candidates: string[];
  colours:     ImportField<{ suggested: string; swatches: string[] }>;
  menu:        ImportField<ImportedMenuCategory[]>;
  surcharges:  ImportField<string[]>;
  social:      Partial<Record<"facebook" | "instagram" | "tiktok", string>>;
  ordering_links: ImportedLink[];
  booking_link:   string | null;
  photos:      ImportField<{ url: string; alt?: string | null }[]>;
};

/** What we keep on businesses.settings.import after the business is created. */
export type StoredImport = {
  source_url:  string;
  final_url:   string;
  fetched_at:  string;
  permission:  { confirmed: true; confirmed_by: string; confirmed_at: string };
  ai_used:     boolean;
  warnings:    string[];
  checks:      Record<string, string>;      // field → note, for the "Check this" labels
  hours?:      ImportedHours | null;
  logo_candidates: string[];
  colours?:    { suggested: string; swatches: string[] } | null;
  menu?:       ImportedMenuCategory[] | null; // cleared once the menu is seeded
  menu_seeded_at?: string | null;
  locations?:  ImportedLocation[] | null;
  surcharges?: string[] | null;
  social:      ImportResult["social"];
  ordering_links: ImportedLink[];
  booking_link:   string | null;
  photos:      { url: string; alt?: string | null }[];  // owner must confirm they own these
  tagline?:    string | null;
  cuisine?:    string | null;
};

export const BUSINESS_TYPES = [
  "restaurant", "cafe", "bar", "bakery", "food_truck",
  "retail", "salon", "gym", "service", "other",
] as const;

export const DIETARY_TAGS = ["Vegetarian", "Vegan", "GF", "DF", "Nut free", "Halal", "Spicy"] as const;

// ─── Enquiries from the contact form on zentrabite.com/contact ─────────────
// Pure helpers for /api/public/enquiries and the super admin Enquiries page.
// No Next.js or Supabase imports, so the rules can be unit tested on their own.
//
// The form lives in apps/web/app/contact/page.tsx. Keep MODULE_IDS and
// ENQUIRY_LIMITS in step with it, and with supabase/migrations/016_enquiries.sql.
//
// The admin page imports the labels and types from here too, so nothing in
// this file may need Node. hashIp uses Web Crypto for that reason.

// ── Form fields ─────────────────────────────────────────────────────────────

/** Module ids the form offers (MODULES in apps/web/app/contact/page.tsx). */
export const MODULE_IDS = [
  "website", "ordering", "bookings", "pos", "loyalty",
  "campaigns", "reviews", "stock", "driver_dispatch", "ai_calls",
] as const;

/** Labels for the admin page. Same wording as the form. */
export const MODULE_LABELS: Record<string, string> = {
  website: "Website",
  ordering: "Online ordering",
  bookings: "Bookings",
  pos: "POS",
  loyalty: "Rewards",
  campaigns: "Win-back texts and emails",
  reviews: "Reviews",
  stock: "Stock",
  driver_dispatch: "Delivery",
  ai_calls: "AI phone calls",
};

/** Longest value saved for each field. The form uses the same maxLength. */
export const ENQUIRY_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  business_name: 160,
  business_type: 80,
  locations: 20,
  current_tools: 500,
  message: 2000,
} as const;

export const ENQUIRY_STATUSES = ["new", "contacted", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export function isEnquiryStatus(v: unknown): v is EnquiryStatus {
  return typeof v === "string" && (ENQUIRY_STATUSES as readonly string[]).includes(v);
}

/** One row as saved. id, created_at, status and ip_hash come from the database. */
export type EnquiryInput = {
  name: string;
  email: string;
  phone: string | null;
  business_name: string;
  business_type: string | null;
  locations: string | null;
  current_tools: string | null;
  modules: string[];
  message: string | null;
};

export type EnquiryRow = EnquiryInput & {
  id: string;
  created_at: string;
  source: string;
  status: EnquiryStatus;
};

type FieldName = keyof typeof ENQUIRY_LIMITS;
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ValidationResult =
  | { ok: true; data: EnquiryInput }
  | { ok: false; fields: FieldErrors };

// Control characters can't be typed into the form and Postgres text can't hold
// NUL, so they are removed. Single-line fields also lose line breaks and tabs.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function singleLine(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\r\n\t]+/g, " ").replace(CONTROL_CHARS, "").trim();
}

function multiLine(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").trim();
}

// Practical check, not RFC 5322: something@something.tld with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(email: string): boolean {
  if (email.length > ENQUIRY_LIMITS.email) return false;
  if (!EMAIL_RE.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return local.length <= 64;
}

const TOO_LONG = (n: number) => `Keep this under ${n.toLocaleString("en-AU")} characters.`;

/**
 * Builds the row to save from the request body. Only known fields are read,
 * so anything else in the body is dropped. Unknown module ids are dropped too.
 */
export function validateEnquiry(body: unknown): ValidationResult {
  const b = (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as Record<string, unknown>;

  const values = {
    name: singleLine(b.name),
    email: singleLine(b.email),
    phone: singleLine(b.phone),
    business_name: singleLine(b.business_name),
    business_type: singleLine(b.business_type),
    locations: singleLine(b.locations),
    current_tools: singleLine(b.current_tools),
    message: multiLine(b.message),
  };

  const fields: FieldErrors = {};
  for (const key of Object.keys(ENQUIRY_LIMITS) as FieldName[]) {
    if (values[key].length > ENQUIRY_LIMITS[key]) fields[key] = TOO_LONG(ENQUIRY_LIMITS[key]);
  }

  if (!values.name) fields.name = "Add your name.";
  if (!values.business_name) fields.business_name = "Add your business name.";
  if (!values.email) fields.email = "Add your email so we can reply.";
  else if (!fields.email && !isValidEmail(values.email)) {
    fields.email = "That email doesn't look right. Check it and try again.";
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  const rawModules = Array.isArray(b.modules) ? b.modules : [];
  const modules = MODULE_IDS.filter(id => rawModules.includes(id));

  return {
    ok: true,
    data: {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      business_name: values.business_name,
      business_type: values.business_type || null,
      locations: values.locations || null,
      current_tools: values.current_tools || null,
      modules,
      message: values.message || null,
    },
  };
}

// ── Spam ────────────────────────────────────────────────────────────────────

/** Name of the hidden field. People never see it, so anything in it is a bot. */
export const HONEYPOT_FIELD = "website";

/** Real people take longer than this to fill the form. The form waits it out. */
export const MIN_FILL_MS = 3000;

/**
 * True when the body looks like a bot: the hidden field has a value, or the
 * form was sent sooner than a person could fill it (or without the timer).
 * The route answers these with a normal success and saves nothing.
 */
export function looksLikeSpam(body: unknown): boolean {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const trap = b[HONEYPOT_FIELD];
  if (trap !== undefined && trap !== null && trap !== "") return true;
  const elapsed = b.elapsed_ms;
  if (typeof elapsed !== "number" || !Number.isFinite(elapsed)) return true;
  return elapsed < MIN_FILL_MS;
}

// ── Where the request came from ────────────────────────────────────────────

const SITE_ORIGINS = ["https://zentrabite.com", "https://www.zentrabite.com"];

// Vercel deployments of the marketing site (repo1-web-rho.vercel.app and its
// previews). Same form as the repo1-dashboard check in lib/tenant.ts.
const WEB_PREVIEW_HOST = /^repo1-web-[a-z0-9-]+\.vercel\.app$/;

export type OriginKind = "website" | "preview" | "local";

/** Which allowed origin this is, or null if the browser origin isn't allowed. */
export function originKind(origin: string | null | undefined, allowLocal: boolean): OriginKind | null {
  if (!origin) return null;
  if (SITE_ORIGINS.includes(origin)) return "website";
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return null;
  }
  // An Origin header is only scheme://host[:port]. Anything more isn't one.
  if (`${u.protocol}//${u.host}` !== origin) return null;
  if (u.protocol === "https:" && !u.port && WEB_PREVIEW_HOST.test(u.hostname)) return "preview";
  if (allowLocal && u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return "local";
  return null;
}

/** Saved in enquiries.source so test sends from previews and dev are easy to spot. */
export function sourceFor(kind: OriginKind | null): string {
  if (kind === "website") return "website";
  if (kind === "preview") return "preview";
  if (kind === "local") return "local";
  return "other";
}

// ── Rate limit ──────────────────────────────────────────────────────────────

// Counted from saved rows, the same way lib/sms.ts and /api/ai-calls/start
// count sends in a time window. Works across serverless instances.
export const ENQUIRY_RATE_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 5 },        // 5 an hour
  { windowMs: 24 * 60 * 60 * 1000, max: 20 },  // 20 a day
] as const;

/** First address in the forwarding chain, as set by Vercel. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

/**
 * The part of the address that identifies one customer. IPv6 users usually
 * get a whole /64, so they're limited per /64 rather than per address.
 */
export function ipKey(ip: string): string {
  let a = ip.trim().toLowerCase();
  if (a.startsWith("[")) a = a.slice(1, a.indexOf("]") > 0 ? a.indexOf("]") : undefined);
  a = a.split("%")[0]!; // zone id
  const mapped = a.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1]!;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(a)) return a;
  if (!a.includes(":")) return a || "unknown";

  const [head = "", tail] = a.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  const groups = tail !== undefined
    ? [...headParts, ...Array(Math.max(0, missing)).fill("0"), ...tailParts]
    : headParts;
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return a;
  return `${groups.slice(0, 4).map(g => g.padStart(4, "0")).join(":")}::/64`;
}

/**
 * Keyed hash of the address, so the raw IP is never stored and the hash
 * can't be reversed by trying every IPv4 address without the key.
 */
export async function hashIp(ip: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`enquiry-ip:${ipKey(ip)}`));
  return Array.from(new Uint8Array(sig).slice(0, 16), b => b.toString(16).padStart(2, "0")).join("");
}

// ── Notification email ──────────────────────────────────────────────────────

export function enquiryEmailText(e: EnquiryInput, source: string): string {
  const modules = e.modules.map(m => MODULE_LABELS[m] ?? m).join(", ");
  return [
    `New enquiry from the ZentraBite contact form (${source}).`,
    "",
    `Name: ${e.name}`,
    `Email: ${e.email}`,
    `Phone: ${e.phone ?? "not given"}`,
    `Business: ${e.business_name}`,
    `Type: ${e.business_type ?? "not given"}`,
    `Locations: ${e.locations ?? "not given"}`,
    `Uses now: ${e.current_tools ?? "not given"}`,
    `Interested in: ${modules || "nothing picked"}`,
    "",
    "Message:",
    e.message ?? "(none)",
    "",
    "Reply to this email to answer them. See every enquiry in the CRM under Super Admin, Enquiries.",
  ].join("\n");
}

// ─── Bringing in a customer list ────────────────────────────────────────────
// A shop's existing customer list (from Square, Shopify, Mailchimp, a loyalty
// app or a spreadsheet), saved as CSV and added on the Customers page. The
// browser reads the file and shows a preview with these helpers, and
// POST /api/customers/import checks every row again with the same helpers
// before anything is saved. Pure, so both sides share it.
//
// Marketing consent (Spam Act 2003). Nobody is opted in by default. A person
// is opted in only when the list has a column saying they agreed (yes, true,
// subscribed and so on) AND the owner confirms they collected that agreement.
// Someone who has opted out stays opted out.
//
// Win-back only texts people whose last order is a while ago
// (customers.last_order_date). A last visit or last order column fills that
// in. Without one, imported people aren't won back until they order.
//
// Dates of birth aren't brought in. The draft privacy policy keeps day and
// month only, and the database still stores a full date.

export const MAX_IMPORT_ROWS = 5000;

export type Field = "name" | "first" | "last" | "phone" | "email" | "consent" | "last_visit";
export type Mapping = Partial<Record<Field, number>>;

export type ImportRow = {
  name:       string;
  phone:      string | null;   // +61 format
  email:      string | null;   // lower case
  consent:    boolean;         // the list says they agreed to marketing
  last_visit: string | null;   // ISO date, yyyy-mm-dd
};

export const FIELD_LABEL: Record<Field, string> = {
  name: "Full name", first: "First name", last: "Last name", phone: "Mobile or phone",
  email: "Email", consent: "Agreed to marketing", last_visit: "Last visit or order",
};

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and new lines inside quotes, CRLF, a leading BOM. Semicolons when the first line has more of them than commas. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(f => f.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(f => f.trim())) rows.push(row);
  return rows.map(r => r.map(f => f.trim()));
}

const HEADERS: [Field, RegExp][] = [
  ["consent",    /(accepts?|agree|consent|opt.?in|subscri|marketing|newsletter|email.?ok|sms.?ok|permission)/i],
  ["last_visit", /(last.?(visit|order|purchase|seen|transaction)|most.?recent)/i],
  ["email",      /e.?mail/i],
  ["phone",      /(mobile|phone|cell|contact.?number|^mob$|^ph$)/i],
  ["first",      /(first|given).?name|^first$/i],
  ["last",       /(last|family|sur).?name|^surname$|^last$/i],
  ["name",       /(^|\s|_)(full.?)?name$|^customer$|^customer.?name$|^name$/i],
];

/** Picks columns by their headings. Each column is used once, consent and dates first, so "Email subscription" counts as consent, not email. */
export function guessMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  const used = new Set<number>();
  for (const [field, re] of HEADERS) {
    const i = headers.findIndex((h, k) => !used.has(k) && re.test(h.trim()));
    if (i >= 0) { m[field] = i; used.add(i); }
  }
  return m;
}

/** An Australian mobile or landline as +61..., or null if it isn't one. */
export function auPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+61")) d = "0" + d.slice(3);
  else if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  else if (/^[2378]\d{8}$/.test(d) || /^4\d{8}$/.test(d)) d = "0" + d;    // spreadsheets drop the leading 0
  if (d.startsWith("00")) return null;
  return /^0[23478]\d{8}$/.test(d) ? `+61${d.slice(1)}` : null;
}

export function cleanEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return e.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/.test(e) ? e : null;
}

export const saysYes = (raw: string | null | undefined): boolean =>
  /^(y|yes|true|1|x|✓|✔|subscribed|opted.?in|agreed|accepted|confirmed)$/i.test((raw ?? "").trim());

/** A date as yyyy-mm-dd. Takes 2026-03-14, 14/03/2026 (day first, as in Australia), 14/3/26, and either with a time after it. */
export function parseDate(raw: string | null | undefined, today = new Date()): string | null {
  const s = (raw ?? "").trim().split(/[ T]/)[0] ?? "";
  let y: number, mo: number, d: number;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { y = +m[1]!; mo = +m[2]!; d = +m[3]!; }
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) {
    d = +m[1]!; mo = +m[2]!; y = +m[3]!;
    if (y < 100) y += 2000;
  } else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 2000 || dt.getTime() > today.getTime() + 86_400_000) return null;   // nothing in the future
  return dt.toISOString().slice(0, 10);
}

/** Turns the file's rows into customers, with why any row was left out. Line numbers count the heading as line 1. */
export function rowsFrom(table: string[][], mapping: Mapping, today = new Date()): { rows: ImportRow[]; skipped: { line: number; reason: string }[] } {
  const rows: ImportRow[] = [];
  const skipped: { line: number; reason: string }[] = [];
  const seen = new Set<string>();
  const get = (r: string[], f: Field) => (mapping[f] === undefined ? "" : (r[mapping[f]!] ?? "").trim());
  table.slice(1).forEach((r, k) => {
    const line = k + 2;
    const phone = auPhone(get(r, "phone"));
    const email = cleanEmail(get(r, "email"));
    const name = (get(r, "name") || [get(r, "first"), get(r, "last")].filter(Boolean).join(" ")).replace(/\s+/g, " ").slice(0, 120);
    if (!phone && !email) {
      skipped.push({ line, reason: get(r, "phone") || get(r, "email") ? "the phone or email isn't valid" : "no phone or email" });
      return;
    }
    const key = phone ?? email!;
    if (seen.has(key) || (phone && email && seen.has(email))) { skipped.push({ line, reason: "already in the file" }); return; }
    seen.add(key);
    if (email) seen.add(email);
    rows.push({
      name:       name || (email ? email.split("@")[0]! : "Customer"),
      phone,
      email,
      consent:    saysYes(get(r, "consent")),
      last_visit: parseDate(get(r, "last_visit"), today),
    });
  });
  return { rows, skipped };
}

// ─── POST /api/customers/import ─────────────────────────────────────────────
// Adds a shop's existing customer list. The Customers page reads the CSV in the
// browser, shows a preview, and sends the rows here. Every row is checked again
// with lib/customer-import.ts, because it comes from the browser.
//
// Body:    { rows: ImportRow[], fileName: string, consentConfirmed: boolean }
// Returns: { added, updated, unchanged, invalid, optedIn, keptOptedOut }
//
// Owners and managers only, for the business they're logged in to.
//
// People already in the list (same phone or email) aren't added twice. A
// missing phone or email is filled in, and a later last visit moves
// last_order_date on. Nothing else about an existing customer changes.
//
// Marketing consent. A row is opted in only when the list says they agreed
// AND the owner confirmed (consentConfirmed) they collected that agreement.
// The source is recorded as "import: <file name>". An import never opts
// anyone out, and never opts in someone who has opted out.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { auPhone, cleanEmail, MAX_IMPORT_ROWS, parseDate, type ImportRow } from "@/lib/customer-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Existing = { id: string; phone: string | null; email: string | null; opted_out: boolean | null; marketing_opt_in: boolean | null; last_order_date: string | null };

const PAGE = 1000;
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, max) : null);
const noon = (day: string) => `${day}T12:00:00.000Z`;

export async function POST(req: Request) {
  const auth = await requireBusiness(null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  const { businessId } = auth;

  const body = (await req.json().catch(() => ({}))) as { rows?: unknown; fileName?: unknown; consentConfirmed?: unknown };
  if (!Array.isArray(body.rows) || !body.rows.length) return NextResponse.json({ error: "There are no customers to add." }, { status: 400 });
  if (body.rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `That's more than ${MAX_IMPORT_ROWS.toLocaleString("en-AU")} people. Split the file and add it in parts.` }, { status: 400 });
  }
  const fileName = str(body.fileName, 100) ?? "a file";
  const consentOk = body.consentConfirmed === true;

  // Check every row again.
  const rows: ImportRow[] = [];
  let invalid = 0;
  for (const raw of body.rows) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const phone = auPhone(typeof r.phone === "string" ? r.phone : null);
    const email = cleanEmail(typeof r.email === "string" ? r.email : null);
    if (!phone && !email) { invalid++; continue; }
    rows.push({
      name:       str(r.name, 120) ?? (email ? email.split("@")[0]! : "Customer"),
      phone,
      email,
      consent:    r.consent === true,
      last_visit: parseDate(typeof r.last_visit === "string" ? r.last_visit : null),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  // Everyone already in the list, a page at a time.
  const existing: Existing[] = [];
  for (let from = 0; from < 100_000; from += PAGE) {
    const { data, error } = await db.from("customers")
      .select("id, phone, email, opted_out, marketing_opt_in, last_order_date")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: "Couldn't read your customer list. Nothing was added." }, { status: 500 });
    existing.push(...((data ?? []) as Existing[]));
    if (!data || data.length < PAGE) break;
  }
  const byPhone = new Map<string, Existing>();
  const byEmail = new Map<string, Existing>();
  for (const c of existing) {
    const p = auPhone(c.phone);
    if (p && !byPhone.has(p)) byPhone.set(p, c);
    const e = cleanEmail(c.email);
    if (e && !byEmail.has(e)) byEmail.set(e, c);
  }

  const now = new Date().toISOString();
  const source = `import: ${fileName}`;
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const touched = new Set<string>();
  let unchanged = 0, optedIn = 0, keptOptedOut = 0;

  for (const r of rows) {
    const match = (r.phone && byPhone.get(r.phone)) || (r.email && byEmail.get(r.email)) || null;
    const optIn = consentOk && r.consent;
    if (match) {
      if (touched.has(match.id)) { unchanged++; continue; }
      touched.add(match.id);
      const patch: Record<string, unknown> = {};
      if (!match.phone && r.phone) patch.phone = r.phone;
      if (!match.email && r.email) patch.email = r.email;
      if (r.last_visit && (!match.last_order_date || Date.parse(match.last_order_date) < Date.parse(noon(r.last_visit)))) {
        patch.last_order_date = noon(r.last_visit);
      }
      if (optIn && !match.marketing_opt_in) {
        if (match.opted_out) keptOptedOut++;
        else { Object.assign(patch, { marketing_opt_in: true, marketing_opt_in_at: now, marketing_opt_in_source: source }); optedIn++; }
      }
      if (Object.keys(patch).length) updates.push({ id: match.id, patch }); else unchanged++;
      continue;
    }
    const row = {
      business_id:             businessId,
      name:                    r.name,
      phone:                   r.phone,
      email:                   r.email,
      source:                  "import",
      last_order_date:         r.last_visit ? noon(r.last_visit) : null,
      marketing_opt_in:        optIn,
      marketing_opt_in_at:     optIn ? now : null,
      marketing_opt_in_source: optIn ? source : null,
    };
    inserts.push(row);
    if (optIn) optedIn++;
    // So a second row for the same person later in the file matches this one.
    const added: Existing = { id: `new-${inserts.length}`, phone: r.phone, email: r.email, opted_out: false, marketing_opt_in: optIn, last_order_date: row.last_order_date };
    touched.add(added.id);
    if (r.phone) byPhone.set(r.phone, added);
    if (r.email) byEmail.set(r.email, added);
  }

  let added = 0;
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await db.from("customers").insert(inserts.slice(i, i + 500));
    if (error) {
      console.error("[customers/import] insert failed:", error.message);
      return NextResponse.json({ error: added ? `Added ${added} people, then something went wrong. Try the file again. People already added won't be added twice.` : "Couldn't add the customers. Nothing was added." }, { status: 500 });
    }
    added += Math.min(500, inserts.length - i);
  }
  let updated = 0;
  for (const u of updates) {
    const { error } = await db.from("customers").update(u.patch).eq("id", u.id).eq("business_id", businessId);
    if (!error) updated++;
    else console.warn("[customers/import] update failed:", error.message);
  }

  return NextResponse.json({ added, updated, unchanged, invalid, optedIn, keptOptedOut });
}

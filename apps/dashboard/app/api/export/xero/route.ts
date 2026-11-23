// ─── GET /api/export/xero ─────────────────────────────────────────────────────
// A CSV for Xero's sales invoice import: an invoice for each order placed in
// the range, and a credit note for each refund made in it. The rows are built
// in lib/xero-export.ts, which explains the Xero side.
//
// Owners and managers, for the shop their login works in (super admins for
// the shop they're looking at).
//
// Query params:
//   from  — ISO date, defaults to 30 days ago
//   to    — ISO date, defaults to now
//
// Response: CSV file download, named "zentrabite-xero-export-YYYY-MM-DD.csv"

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { csvCell } from "@/lib/csv";
import { DEFAULT_TIMEZONE } from "@/lib/pickup-times";
import { xeroRows, type XeroOrder } from "@/lib/xero-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = "id, total, refunded_amount, refunded_at, source, channel, created_at, customers(name, email)";

export async function GET(req: Request) {
  const auth = await requireBusiness(null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  const businessId = auth.businessId;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam   = url.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to   = toParam ? new Date(toParam) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "from and to must be dates" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [bizRes, salesRes, refundsRes] = await Promise.all([
    admin.from("businesses").select("settings").eq("id", businessId).single(),
    admin.from("orders").select(COLUMNS).eq("business_id", businessId)
      .gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
      .order("created_at", { ascending: true }),
    admin.from("orders").select(COLUMNS).eq("business_id", businessId)
      .gt("refunded_amount", 0)
      .gte("refunded_at", from.toISOString()).lte("refunded_at", to.toISOString())
      .order("refunded_at", { ascending: true }),
  ]);
  if (salesRes.error || refundsRes.error) {
    return NextResponse.json({ error: "Couldn't read the orders. Try again." }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (bizRes.data?.settings ?? {}) as any;
  const rows = xeroRows((salesRes.data ?? []) as unknown as XeroOrder[], (refundsRes.data ?? []) as unknown as XeroOrder[], {
    timeZone:    settings.timezone || DEFAULT_TIMEZONE,
    accountCode: settings.xero?.account_code,
    taxType:     settings.xero?.tax_type,
  });

  // Quotes where needed and stops spreadsheet formulas (lib/csv.ts).
  const csv = rows.map(r => r.map(v => csvCell(v)).join(",")).join("\n") + "\n";
  const filename = `zentrabite-xero-export-${to.toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}

// ─── GET /api/export/xero ─────────────────────────────────────────────────────
// Generates a Xero-compatible Sales Invoice CSV from the merchant's orders.
//
// Xero's CSV import format (Sales Invoices):
//   ContactName, InvoiceNumber, InvoiceDate, DueDate, Description,
//   Quantity, UnitAmount, AccountCode, TaxType
//
// Query params:
//   from  — ISO date, defaults to 30 days ago
//   to    — ISO date, defaults to today
//
// Response: CSV file download, named "zentrabite-xero-export-YYYY-MM-DD.csv"

import { NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Xero default sales revenue account & 10% GST tax code for AU.
// Merchants can override via businesses.settings.xero.{ account_code, tax_type }.
const DEFAULT_ACCOUNT_CODE = "200";
const DEFAULT_TAX_TYPE     = "OUTPUT";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Quote fields containing comma, quote, or newline; double up any quotes.
  if (/[,"\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDate(iso: string): string {
  // Xero accepts DD/MM/YYYY — the most common AU format.
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export async function GET(req: Request) {
  // ── Auth ──
  const session = await createSessionClient();
  const { data: userRes } = await session.auth.getUser();
  if (!userRes?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userRow } = await session
    .from("users")
    .select("business_id")
    .eq("id", userRes.user.id)
    .single();

  const businessId = userRow?.business_id as string | undefined;
  if (!businessId) {
    return NextResponse.json({ error: "No business" }, { status: 403 });
  }

  // ── Date range ──
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam   = url.searchParams.get("to");
  const from = fromParam
    ? new Date(fromParam)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = toParam ? new Date(toParam) : new Date();

  // ── Load orders + business config ──
  const admin = createAdminClient();
  const [bizRes, ordersRes] = await Promise.all([
    admin.from("businesses").select("settings").eq("id", businessId).single(),
    admin
      .from("orders")
      .select("id, total, source, channel, status, customer_id, customers(name, email), created_at")
      .eq("business_id", businessId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: true }),
  ]);

  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  const xeroCfg = (bizRes.data?.settings as any)?.xero ?? {};
  const accountCode = xeroCfg.account_code ?? DEFAULT_ACCOUNT_CODE;
  const taxType     = xeroCfg.tax_type     ?? DEFAULT_TAX_TYPE;

  // ── Build CSV ──
  const header = [
    "ContactName", "InvoiceNumber", "InvoiceDate", "DueDate",
    "Description", "Quantity", "UnitAmount", "AccountCode", "TaxType",
  ];

  const rows: string[][] = [header];

  for (const order of ordersRes.data ?? []) {
    const customer = (order as any).customers as { name?: string; email?: string } | null;
    const contactName = customer?.name?.trim() || customer?.email?.trim() || "Walk-in Customer";
    const invoiceNumber = `ZB-${String(order.id).slice(0, 8).toUpperCase()}`;
    const date = fmtDate(order.created_at);
    const description = `${order.channel ?? order.source ?? "direct"} order`;

    rows.push([
      contactName,
      invoiceNumber,
      date,
      date, // DueDate same as invoice date (paid at checkout)
      description,
      "1",
      String(Number(order.total ?? 0).toFixed(2)),
      accountCode,
      taxType,
    ]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";

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

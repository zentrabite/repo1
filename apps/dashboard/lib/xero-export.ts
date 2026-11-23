// ─── The Xero sales export ───────────────────────────────────────────────────
// Builds the CSV that /api/export/xero sends, for Xero's sales invoice import
// (Business → Invoices → Import). One invoice per order on the day it was
// placed, and one credit note per refunded order on the day of the refund.
//
//   • Xero imports a line with a negative amount as a credit note, as a draft
//     to approve. The credit note's number is the invoice's with "-CR".
//   • Order totals include GST, so pick "tax inclusive" when Xero asks
//     whether UnitAmount includes tax.
//   • TaxType must match a tax rate name in the shop's Xero. Australian Xero
//     calls sales GST "GST on Income". A shop can change it, and the account
//     code, in businesses.settings.xero.
//   • Dates are DD/MM/YYYY in the shop's own time zone.
//   • A credit note carries everything refunded on the order so far. If an
//     order is part refunded twice with an export in between, the second
//     export repeats the first part. Fix the earlier credit note in Xero.

export const DEFAULT_ACCOUNT_CODE = "200";
export const DEFAULT_TAX_TYPE = "GST on Income";

export const XERO_HEADER = [
  "ContactName", "InvoiceNumber", "InvoiceDate", "DueDate",
  "Description", "Quantity", "UnitAmount", "AccountCode", "TaxType",
];

export type XeroOrder = {
  id: string;
  total: number | string | null;
  refunded_amount?: number | string | null;
  refunded_at?: string | null;
  source?: string | null;
  channel?: string | null;
  created_at: string;
  customers?: { name?: string | null; email?: string | null } | null;
};

export type XeroOptions = { timeZone: string; accountCode?: string; taxType?: string };

/** DD/MM/YYYY in the shop's time zone. */
export function xeroDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

export const invoiceNumber = (orderId: string) => `ZB-${orderId.slice(0, 8).toUpperCase()}`;

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function what(o: XeroOrder): string {
  const src = o.channel ?? o.source ?? "direct";
  if (src === "pos") return "Counter sale";
  if (src === "direct") return "Online order";
  return `${src.replace(/_/g, " ")} order`;
}

const contact = (o: XeroOrder) => o.customers?.name?.trim() || o.customers?.email?.trim() || "Walk-in Customer";

/** Header, then an invoice for each sale and a credit note for each refund. */
export function xeroRows(sales: XeroOrder[], refunds: XeroOrder[], opts: XeroOptions): string[][] {
  const account = opts.accountCode || DEFAULT_ACCOUNT_CODE;
  const tax = opts.taxType || DEFAULT_TAX_TYPE;
  const rows: string[][] = [XERO_HEADER];
  for (const o of sales) {
    const total = money(o.total);
    if (total <= 0) continue;
    const date = xeroDate(o.created_at, opts.timeZone);
    rows.push([contact(o), invoiceNumber(o.id), date, date, what(o), "1", total.toFixed(2), account, tax]);
  }
  for (const o of refunds) {
    const refunded = Math.min(money(o.refunded_amount), money(o.total));
    if (refunded <= 0 || !o.refunded_at) continue;
    const date = xeroDate(o.refunded_at, opts.timeZone);
    rows.push([contact(o), `${invoiceNumber(o.id)}-CR`, date, date, `Refund of ${invoiceNumber(o.id)}`, "1", (-refunded).toFixed(2), account, tax]);
  }
  return rows;
}

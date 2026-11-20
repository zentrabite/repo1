// ─── Kitchen docket ─────────────────────────────────────────────────────────
// A printable docket for one order, sized for an 80mm docket printer and
// fine on A4 too. docketHtml() is pure, so it's easy to test. printDocket()
// prints it from a hidden frame, so the Orders page stays where it is.
//
// A real docket printer link (one that prints with no dialog) comes later,
// once a pilot shop says which printer it has.

import { optionsLabel } from "@/lib/menu-options";
import { shopTime } from "@/lib/pickup-times";

export type DocketItem = { name?: string; qty?: number; price?: number; options?: { name: string }[] };
export type DocketOrder = {
  id: string;
  created_at: string;
  items: unknown;
  total: number;
  source?: string | null;
  fulfillment_type?: string | null;
  pickup_at?: string | null;
  pickup_asap?: boolean | null;
  notes?: string | null;
  ship_to?: unknown;
  delivery_fee?: number | null;
  discount?: number | null;
};

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const money = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

export function docketHtml(input: {
  order: DocketOrder;
  businessName: string;
  timezone: string;
  customer?: { name?: string | null; phone?: string | null } | null;
}): string {
  const { order, businessName, timezone, customer } = input;
  const delivery = order.fulfillment_type === "delivery";
  const kind = delivery ? "DELIVERY"
    : order.fulfillment_type === "dine_in" ? "DINE-IN"
    : order.fulfillment_type === "takeaway" ? "TAKEAWAY"
    : "PICK-UP";
  const when = order.pickup_at
    ? `${order.pickup_asap ? "ASAP " : ""}${shopTime(new Date(order.pickup_at), timezone)}`
    : "";
  const address = delivery && order.ship_to && typeof order.ship_to === "object"
    ? String((order.ship_to as { address?: unknown }).address ?? "")
    : "";
  const items = (Array.isArray(order.items) ? order.items : []) as DocketItem[];
  const rows = items.map(it => {
    const qty = Number(it.qty) || 1;
    const opts = it.options?.length ? `<div class="opts">${esc(optionsLabel(it.options))}</div>` : "";
    return `<div class="item"><div class="row"><span><b>${qty} &times;</b> ${esc(it.name ?? "Item")}</span><span>${money((Number(it.price) || 0) * qty)}</span></div>${opts}</div>`;
  }).join("");
  const paid = order.source === "pos" ? "Paid at the counter" : "Paid online";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Order ${esc(order.id.slice(0, 8))}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0 auto; max-width: 72mm; font-size: 12pt; line-height: 1.3; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 2mm; }
  .kind { font-size: 20pt; font-weight: 700; text-align: center; margin: 1mm 0; }
  .when { font-size: 16pt; font-weight: 700; text-align: center; margin: 0 0 2mm; }
  .meta { font-size: 10pt; text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 3mm; }
  .item { margin: 1.5mm 0; }
  .opts { font-size: 10.5pt; padding-left: 6mm; }
  .note { border: 2px solid #000; padding: 2mm; margin: 3mm 0; font-weight: 700; white-space: pre-wrap; }
  .who { margin: 2mm 0; }
  hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0; }
  .total { font-size: 13pt; font-weight: 700; }
</style></head>
<body>
  <h1>${esc(businessName)}</h1>
  <div class="kind">${kind}</div>
  ${when ? `<div class="when">${esc(when)}</div>` : ""}
  <div class="meta">Order ${esc(order.id.slice(0, 8))} &middot; placed ${esc(shopTime(new Date(order.created_at), timezone))}</div>
  ${customer?.name || customer?.phone ? `<div class="who">${esc(customer?.name ?? "")}${customer?.phone ? ` &middot; ${esc(customer.phone)}` : ""}</div>` : ""}
  ${address ? `<div class="who"><b>Deliver to</b><br>${esc(address)}</div>` : ""}
  <hr>
  ${rows || "<div>No items</div>"}
  ${order.notes ? `<div class="note">NOTE: ${esc(order.notes)}</div>` : ""}
  <hr>
  ${delivery && order.delivery_fee ? `<div class="row"><span>Delivery</span><span>${money(order.delivery_fee)}</span></div>` : ""}
  ${Number(order.discount) > 0 ? `<div class="row"><span>First order offer</span><span>-${money(order.discount)}</span></div>` : ""}
  <div class="row total"><span>Total</span><span>${money(order.total)}</span></div>
  <div class="meta">${paid}</div>
</body></html>`;
}

/** Prints the HTML from a hidden frame and removes the frame afterwards. */
export function printDocument(html: string): void {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  frame.onload = () => {
    const w = frame.contentWindow;
    if (!w) return;
    const done = () => setTimeout(() => frame.remove(), 500);
    w.addEventListener("afterprint", done, { once: true });
    w.focus();
    w.print();
    // Some browsers don't fire afterprint. Tidy up anyway.
    setTimeout(() => frame.isConnected && frame.remove(), 120_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

// ─── Email (Resend) ────────────────────────────────────────────────────────
// Tiny wrapper around the Resend REST API — no SDK dep, runs on edge or node.
//
// Two kinds of email:
//   • transactional (receipts, invites, billing notices): sendEmail()
//   • marketing (win-back offers, promotions): sendMarketingEmail() ONLY.
//     It checks consent right before sending, adds the unsubscribe link and
//     the List-Unsubscribe headers. Spam Act 2003 needs all three.
//
// ENV:
//   RESEND_API_KEY          — pk/sk from resend.com
//   RESEND_FROM_EMAIL       — optional; defaults to "ZentraBite <hello@zentrabite.com>"
//   NEXT_PUBLIC_APP_URL     — used for links in templates
//
// If RESEND_API_KEY is unset the helper no-ops — useful for local dev so you
// don't need keys to test an order flow.

import "server-only";
import { canSendMarketing, unsubscribeLinks } from "@/lib/unsubscribe";

export type EmailResult =
  | { ok: true;  id: string }
  | { ok: false; error: string; skipped?: boolean };

export type SendEmailInput = {
  to:      string;
  subject: string;
  text:    string;
  html?:   string;
  from?:   string;
  replyTo?: string;
  /** Extra email headers, passed straight to Resend. */
  headers?: Record<string, string>;
};

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — email skipped");
    return { ok: false, error: "RESEND_API_KEY not set", skipped: true };
  }

  const from = input.from ?? process.env.RESEND_FROM_EMAIL ?? "ZentraBite <hello@zentrabite.com>";
  const html = input.html ?? `<pre style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#0F1F2D;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from,
        to:       input.to,
        subject:  input.subject,
        text:     input.text,
        html,
        reply_to: input.replyTo,
        ...(input.headers ? { headers: input.headers } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${body?.message ?? "unknown"}` };
    }
    return { ok: true, id: body.id ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Marketing email ───────────────────────────────────────────────────────
// Every marketing send goes through here. It:
//   1. checks the customer still has marketing consent and hasn't opted out
//      (canSendMarketing), so a customer who unsubscribed a minute ago is
//      skipped even mid-run
//   2. adds a footer naming the business with a working unsubscribe link
//   3. adds List-Unsubscribe and List-Unsubscribe-Post, so mail apps show
//      their own one-click unsubscribe button
// It refuses to send if it can't build the unsubscribe link.

export type MarketingEmailInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db:           any;
  businessId:   string;
  businessName: string;
  customerId:   string;
  to:           string;
  subject:      string;
  text:         string;
};

export async function sendMarketingEmail(input: MarketingEmailInput): Promise<EmailResult> {
  const { db, businessId, businessName, customerId, to, subject, text } = input;

  if (!(await canSendMarketing(db, businessId, customerId, to))) {
    return { ok: false, error: "Customer has opted out or hasn't agreed to marketing", skipped: true };
  }

  const links = unsubscribeLinks(customerId);
  if (!links) {
    console.error("[email] marketing email not sent: no unsubscribe link (SUPABASE_SERVICE_ROLE_KEY missing?)");
    return { ok: false, error: "Unsubscribe link unavailable" };
  }

  const footer = [
    `You're getting this because you agreed to hear from ${businessName}.`,
    `Unsubscribe: ${links.page}`,
    `Sent by ZentraBite for ${businessName}.`,
  ].join("\n");

  return sendEmail({
    to,
    subject,
    text: `${text.trim()}\n\n--\n${footer}`,
    html: marketingHtml(businessName, text, links.page),
    headers: {
      "List-Unsubscribe":      `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

function marketingHtml(businessName: string, text: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFB;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:32px 28px;box-shadow:0 1px 4px rgba(15,31,45,.06)">
        <tr><td>
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7C93;font-weight:600">${escapeHtml(businessName)}</div>
          <div style="margin-top:12px;font-size:15px;line-height:1.6;color:#0F1F2D;white-space:pre-wrap">${escapeHtml(text.trim())}</div>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eceff4;font-size:12px;color:#6B7C93;line-height:1.6">
            You're getting this because you agreed to hear from ${escapeHtml(businessName)}.
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6B7C93;text-decoration:underline">Unsubscribe</a>
          </div>
        </td></tr>
      </table>
      <div style="margin-top:18px;font-size:11px;color:#6B7C93">Sent by ZentraBite for ${escapeHtml(businessName)}</div>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Templates ─────────────────────────────────────────────────────────────
// Keep templates inline and small. If they grow, split into separate files.

export type CustomerReceiptInput = {
  to:           string;
  customerName: string;
  businessName: string;
  orderNumber:  string;
  total:        number;
  items:        { name: string; qty?: number; price?: number }[];
  storeUrl?:    string;
};

export async function sendCustomerReceipt(input: CustomerReceiptInput): Promise<EmailResult> {
  const { customerName, businessName, orderNumber, total, items, storeUrl } = input;
  const subject = `Your ${businessName} order — #${orderNumber}`;
  const itemLines = items
    .map(it => `  • ${it.qty ? `${it.qty}× ` : ""}${it.name}${it.price ? ` — $${it.price.toFixed(2)}` : ""}`)
    .join("\n");

  const text = [
    `Thanks for your order, ${customerName}!`,
    ``,
    `Order #${orderNumber}`,
    `Total: $${total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    storeUrl ? `View or reorder: ${storeUrl}` : "",
    ``,
    `— ${businessName}`,
  ].filter(Boolean).join("\n");

  const html = receiptHtml(input);
  return sendEmail({ to: input.to, subject, text, html });
}

function receiptHtml(input: CustomerReceiptInput): string {
  const { customerName, businessName, orderNumber, total, items, storeUrl } = input;
  const rows = items.map(it => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eceff4;font-size:14px;color:#0F1F2D">
        ${it.qty ? `<span style="color:#6B7C93">${it.qty}× </span>` : ""}${escapeHtml(it.name)}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eceff4;font-size:14px;color:#0F1F2D;text-align:right">
        ${it.price ? `$${it.price.toFixed(2)}` : ""}
      </td>
    </tr>
  `).join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFB;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:32px 28px;box-shadow:0 1px 4px rgba(15,31,45,.06)">
        <tr><td>
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7C93;font-weight:600">${escapeHtml(businessName)}</div>
          <h1 style="margin:4px 0 20px;font-size:22px;color:#0F1F2D;font-weight:600">Thanks, ${escapeHtml(customerName)} — we're on it.</h1>

          <div style="background:#F0F4F8;border-radius:10px;padding:14px 16px;margin-bottom:20px">
            <div style="font-size:12px;color:#6B7C93">Order</div>
            <div style="font-size:15px;font-weight:600;color:#0F1F2D;margin-top:2px">#${escapeHtml(orderNumber)}</div>
          </div>

          <table width="100%" cellpadding="0" cellspacing="0">${rows}
            <tr>
              <td style="padding-top:14px;font-size:15px;font-weight:600;color:#0F1F2D">Total</td>
              <td style="padding-top:14px;font-size:15px;font-weight:600;color:#0F1F2D;text-align:right">$${total.toFixed(2)}</td>
            </tr>
          </table>

          ${storeUrl ? `
          <div style="text-align:center;margin-top:28px">
            <a href="${escapeHtml(storeUrl)}" style="display:inline-block;padding:12px 22px;background:#00B67A;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">View or reorder →</a>
          </div>` : ""}

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eceff4;font-size:12px;color:#6B7C93;line-height:1.6">
            Questions? Just reply to this email — it'll go straight to ${escapeHtml(businessName)}.
          </div>
        </td></tr>
      </table>
      <div style="margin-top:18px;font-size:11px;color:#6B7C93">Powered by ZentraBite</div>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
}

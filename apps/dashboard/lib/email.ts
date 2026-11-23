// ─── Email (Resend) ────────────────────────────────────────────────────────
// Tiny wrapper around the Resend REST API — no SDK dep, runs on edge or node.
//
// Every email is one of the three kinds in lib/message-kinds.ts.
//   • must_reach and account (receipts, alerts, invites, billing notices,
//     reports): sendEmail({ kind, ... }). Never checks opt-outs, so an
//     unsubscribe never stops an order receipt or a login link.
//   • marketing (win-back offers, promotions): sendMarketingEmail() ONLY.
//     It checks consent right before sending, adds the unsubscribe link and
//     the List-Unsubscribe headers (Spam Act 2003 needs all three), and sends
//     from the marketing address under the shop's name.
//
// ENV:
//   RESEND_API_KEY            pk/sk from resend.com
//   RESEND_FROM_EMAIL         must_reach and account mail. Defaults to
//                             "ZentraBite <hello@zentrabite.com>"
//   RESEND_MARKETING_FROM_EMAIL  marketing mail, on its own sending
//                             subdomain so a spam complaint about an offer
//                             can't hurt receipts. Falls back to
//                             RESEND_FROM_EMAIL until that subdomain exists
//   NEXT_PUBLIC_APP_URL       used for links in templates
//
// If RESEND_API_KEY is unset the helper no-ops — useful for local dev so you
// don't need keys to test an order flow.

import "server-only";
import crypto from "node:crypto";
import { canSendMarketing, unsubscribeLinks } from "@/lib/unsubscribe";
import { activePause } from "@/lib/send-guard";
import type { MessageKind } from "@/lib/message-kinds";

export type EmailResult =
  | { ok: true;  id: string }
  | { ok: false; error: string; skipped?: boolean };

export type SendEmailInput = {
  /** must_reach or account. Marketing goes through sendMarketingEmail(). */
  kind:    Exclude<MessageKind, "marketing">;
  to:      string;
  subject: string;
  text:    string;
  html?:   string;
  from?:   string;
  replyTo?: string;
  /** Extra email headers, passed straight to Resend. */
  headers?: Record<string, string>;
};

const DEFAULT_FROM = "ZentraBite <hello@zentrabite.com>";

/**
 * Checks a Resend webhook (Svix signing). secret is RESEND_WEBHOOK_SECRET,
 * "whsec_" then base64. Signed content is "id.timestamp.body", the signature
 * header holds one or more "v1,<base64>", and the timestamp must be within
 * 5 minutes so an old report can't be replayed.
 */
export function validResendSignature(secret: string, headers: { id: string; timestamp: string; signature: string }, body: string, now: number = Date.now()): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  let key: Buffer;
  try { key = Buffer.from(secret.replace(/^whsec_/, ""), "base64"); } catch { return false; }
  if (!key.length) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64"));
  return signature.split(" ").some(part => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

/** The sending address for a kind. Marketing has its own, once it's set up. */
export function fromAddress(kind: MessageKind): string {
  const account = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  return kind === "marketing" ? (process.env.RESEND_MARKETING_FROM_EMAIL || account) : account;
}

/** "Nonna's Kitchen via ZentraBite <offers@...>", so the shop is the sender people see. */
export function fromShop(from: string, shopName: string): string {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const name = shopName.replace(/["<>,;\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return name ? `"${name} via ZentraBite" <${address}>` : from;
}

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  if ((input.kind as string) === "marketing") {
    // Marketing must go through sendMarketingEmail, which checks consent.
    return { ok: false, error: "Marketing email must go through sendMarketingEmail" };
  }
  return deliver({ ...input, from: input.from ?? fromAddress(input.kind) });
}

async function deliver(input: Omit<SendEmailInput, "kind"> & { from: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — email skipped");
    return { ok: false, error: "RESEND_API_KEY not set", skipped: true };
  }

  const from = input.from;
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
//   0. checks the shop's marketing email isn't paused (lib/send-guard.ts)
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

  // A stop rule (lib/stop-rules.ts) or staff may have paused this shop's marketing email.
  if (await activePause(db, businessId, "email")) {
    return { ok: false, error: "Marketing email is paused for this shop", skipped: true };
  }
  if (!(await canSendMarketing(db, businessId, customerId, to))) {
    return { ok: false, error: "Customer has opted out or hasn't agreed to marketing", skipped: true };
  }

  const links = await unsubscribeLinks(db, customerId);
  if (!links) {
    console.error("[email] marketing email not sent: no unsubscribe link (link_signing_secret, migration 035, couldn't be read)");
    return { ok: false, error: "Unsubscribe link unavailable" };
  }

  const footer = [
    `You're getting this because you agreed to hear from ${businessName}.`,
    `Unsubscribe: ${links.page}`,
    `Sent by ZentraBite for ${businessName}.`,
  ].join("\n");

  return deliver({
    from: fromShop(fromAddress("marketing"), businessName),
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
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5B6B80;font-weight:600">${escapeHtml(businessName)}</div>
          <div style="margin-top:12px;font-size:15px;line-height:1.6;color:#0F1F2D;white-space:pre-wrap">${escapeHtml(text.trim())}</div>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eceff4;font-size:12px;color:#5B6B80;line-height:1.6">
            You're getting this because you agreed to hear from ${escapeHtml(businessName)}.
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5B6B80;text-decoration:underline">Unsubscribe</a>
          </div>
        </td></tr>
      </table>
      <div style="margin-top:18px;font-size:11px;color:#5B6B80">Sent by ZentraBite for ${escapeHtml(businessName)}</div>
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
  /** "As soon as possible, about 6:20pm" or "6:30pm". */
  pickupLabel?: string;
  /** Delivered by the shop's own driver, to deliveryAddress. */
  delivery?: boolean;
  deliveryAddress?: string;
  /** The customer's note for the kitchen or the driver. */
  note?: string;
  /** Taken off by the first order offer or a win-back code. total is after it. */
  discount?: number;
  /** What took it off, "First order offer" (the default) or "Your code" (a win-back code). */
  discountLabel?: string;
  /** The shop's order alert email, so a reply reaches the shop. */
  replyTo?: string;
};

// A receipt is must_reach, so it carries nothing that sells. No "order
// again" button, which would make it marketing (lib/message-kinds.ts).
export async function sendCustomerReceipt(input: CustomerReceiptInput): Promise<EmailResult> {
  const { customerName, businessName, orderNumber, total, items } = input;
  const subject = `Your ${businessName} order — #${orderNumber}`;
  const itemLines = items
    .map(it => `  • ${it.qty ? `${it.qty}× ` : ""}${it.name}${it.price ? ` — $${it.price.toFixed(2)}` : ""}`)
    .join("\n");

  const text = [
    `Thanks for your order, ${customerName}!`,
    ``,
    `Order #${orderNumber}`,
    input.pickupLabel ? `${input.delivery ? "Delivery" : "Pick-up"}: ${input.pickupLabel}` : "",
    input.delivery && input.deliveryAddress ? `Deliver to: ${input.deliveryAddress}` : "",
    input.note ? `Your note: ${input.note}` : "",
    input.discount ? `${input.discountLabel ?? "First order offer"}: -$${input.discount.toFixed(2)}` : "",
    `Total: $${total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    contactLine(input),
    ``,
    `— ${businessName}`,
  ].filter(Boolean).join("\n");

  const html = receiptHtml(input);
  return sendEmail({ kind: "must_reach", to: input.to, subject, text, html, from: fromShop(fromAddress("must_reach"), businessName), replyTo: input.replyTo });
}

function contactLine(input: CustomerReceiptInput): string {
  return input.replyTo
    ? `Questions? Reply to this email and it goes to ${input.businessName}.`
    : `Questions? Contact ${input.businessName} directly.`;
}

function receiptHtml(input: CustomerReceiptInput): string {
  const { customerName, businessName, orderNumber, total, items } = input;
  const rows = items.map(it => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eceff4;font-size:14px;color:#0F1F2D">
        ${it.qty ? `<span style="color:#5B6B80">${it.qty}× </span>` : ""}${escapeHtml(it.name)}
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
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5B6B80;font-weight:600">${escapeHtml(businessName)}</div>
          <h1 style="margin:4px 0 20px;font-size:22px;color:#0F1F2D;font-weight:600">Thanks, ${escapeHtml(customerName)} — we're on it.</h1>

          <div style="background:#F0F4F8;border-radius:10px;padding:14px 16px;margin-bottom:20px">
            <div style="font-size:12px;color:#5B6B80">Order</div>
            <div style="font-size:15px;font-weight:600;color:#0F1F2D;margin-top:2px">#${escapeHtml(orderNumber)}</div>
            ${input.pickupLabel ? `<div style="font-size:12px;color:#5B6B80;margin-top:10px">${input.delivery ? "Delivery" : "Pick-up"}</div>
            <div style="font-size:15px;font-weight:600;color:#0F1F2D;margin-top:2px">${escapeHtml(input.pickupLabel)}</div>` : ""}
            ${input.delivery && input.deliveryAddress ? `<div style="font-size:12px;color:#5B6B80;margin-top:10px">Deliver to</div>
            <div style="font-size:15px;font-weight:600;color:#0F1F2D;margin-top:2px">${escapeHtml(input.deliveryAddress)}</div>` : ""}
            ${input.note ? `<div style="font-size:12px;color:#5B6B80;margin-top:10px">Your note</div>
            <div style="font-size:14px;color:#0F1F2D;margin-top:2px">${escapeHtml(input.note)}</div>` : ""}
          </div>

          <table width="100%" cellpadding="0" cellspacing="0">${rows}
            ${input.discount ? `<tr>
              <td style="padding-top:10px;font-size:14px;color:#0F1F2D">${escapeHtml(input.discountLabel ?? "First order offer")}</td>
              <td style="padding-top:10px;font-size:14px;color:#0F1F2D;text-align:right">-$${input.discount.toFixed(2)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding-top:14px;font-size:15px;font-weight:600;color:#0F1F2D">Total</td>
              <td style="padding-top:14px;font-size:15px;font-weight:600;color:#0F1F2D;text-align:right">$${total.toFixed(2)}</td>
            </tr>
          </table>

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eceff4;font-size:12px;color:#5B6B80;line-height:1.6">
            ${escapeHtml(contactLine(input))}
          </div>
        </td></tr>
      </table>
      <div style="margin-top:18px;font-size:11px;color:#5B6B80">Powered by ZentraBite</div>
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

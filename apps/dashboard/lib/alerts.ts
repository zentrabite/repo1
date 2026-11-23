// ─── Telling the team ───────────────────────────────────────────────────────
// Who gets told when something breaks. One address for now, ALERT_EMAIL
// (set in Vercel). It's told when:
//   • a stop rule pauses a shop's marketing (lib/send-guard.ts)
//   • a kill switch goes on or off (/api/admin/sending)
//   • the daily run finds a connection down (lib/health.ts)
// These are account emails (lib/message-kinds.ts). Nothing sends until
// ALERT_EMAIL is set and Resend's domain is verified, and the pages show the
// same things in Super Admin, Sending, either way. Never throws.

import "server-only";
import { sendEmail } from "@/lib/email";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The address that gets alerts, or null when none is set. */
export function alertAddress(): string | null {
  const to = (process.env.ALERT_EMAIL ?? "").trim();
  return EMAIL.test(to) ? to : null;
}

/** Emails the team. False when it didn't go (no address, or email isn't set up). */
export async function alertTeam(subject: string, lines: string[]): Promise<boolean> {
  const to = alertAddress();
  if (!to) return false;
  try {
    const page = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/+$/, "")}/admin/sending`;
    const out = await sendEmail({ kind: "account", to, subject: `ZentraBite: ${subject}`, text: [...lines, "", `Super Admin, Sending: ${page}`].join("\n") });
    return out.ok;
  } catch {
    return false;
  }
}

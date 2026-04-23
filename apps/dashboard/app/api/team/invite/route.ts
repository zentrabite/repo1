// ─── POST /api/team/invite ────────────────────────────────────────────────────
// Called from Settings → Team → Invite.
//
// Behaviour:
//   1. Verifies the caller is signed in (Supabase session cookie).
//   2. Generates a Supabase auth "invite" link via the admin API (service role).
//      Supabase handles the email itself IF you've configured SMTP, but in
//      practice most teams haven't — so we ALSO send a pretty email via Resend
//      that includes the signup link. Customer gets one invite either way.
//   3. Records the invite locally so Settings can show it as "Invited".
//
// ENV required:
//   SUPABASE_SERVICE_ROLE_KEY  — to call admin.generateLink
//   RESEND_API_KEY             — to send the pretty email (falls back silently)
//   NEXT_PUBLIC_APP_URL        — where the signup link points (defaults fine)

import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteBody = {
  email:       string;
  businessId?: string;
  role?:       string;          // "Owner" | "Manager" | "Staff"
  businessName?: string;
};

export async function POST(req: Request) {
  try {
    const { email, businessId, role = "Staff", businessName = "your team" } = (await req.json()) as InviteBody;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Must be signed in
    const session = await createSessionClient();
    const { data: userRes } = await session.auth.getUser();
    const inviter = userRes?.user;
    if (!inviter) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com.au";

    // Generate the Supabase magic-link / invite URL (no email sent by Supabase
    // unless SMTP configured — we handle delivery ourselves).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: linkData, error: linkErr } = await (admin.auth as any).admin.generateLink({
      type:     "invite",
      email,
      options:  { redirectTo: `${appUrl}/login` },
    });

    // If Supabase can't mint a link (e.g. user already exists) we still send
    // a "come join us" email with a plain login URL — don't hard-fail.
    const actionLink: string = linkData?.properties?.action_link ?? `${appUrl}/login`;

    if (linkErr) {
      console.warn("[team/invite] Supabase generateLink error:", linkErr.message);
    }

    // Record in business_members if you've got that table; otherwise this is
    // a no-op safety net for future auditing.
    if (businessId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from("business_members") as any).upsert({
          business_id: businessId,
          email,
          role,
          invited_by:  inviter.id,
          status:      "invited",
        }, { onConflict: "business_id,email" });
      } catch {
        // business_members table may not exist yet — swallow
      }
    }

    // Send the pretty email (no-op if RESEND_API_KEY missing)
    const subject = `You've been invited to ${businessName} on ZentraBite`;
    const text = [
      `Hi,`,
      ``,
      `${inviter.email} added you to ${businessName} on ZentraBite as ${role}.`,
      ``,
      `Click this link to set a password and jump in:`,
      actionLink,
      ``,
      `If the link has expired, go to ${appUrl}/login and use "Forgot password".`,
      ``,
      `— ZentraBite`,
    ].join("\n");

    const html = inviteHtml({
      inviterEmail: inviter.email ?? "A teammate",
      businessName,
      role,
      actionLink,
      appUrl,
    });

    const result = await sendEmail({ to: email, subject, text, html });

    if (!result.ok && !result.skipped) {
      return NextResponse.json({ error: result.error, actionLink }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      delivered: result.ok,
      skipped:   result.ok ? false : Boolean(result.skipped),
      // Returned so the UI can show the link if Resend is unconfigured — the
      // inviter can paste it into Slack/DM as a fallback.
      actionLink,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[team/invite]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Template ────────────────────────────────────────────────────────────────

function inviteHtml(input: {
  inviterEmail: string;
  businessName: string;
  role:         string;
  actionLink:   string;
  appUrl:       string;
}): string {
  const { inviterEmail, businessName, role, actionLink } = input;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFB;padding:24px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:32px 28px;box-shadow:0 1px 4px rgba(15,31,45,.06)">
        <tr><td>
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7C93;font-weight:600">ZentraBite</div>
          <h1 style="margin:4px 0 16px;font-size:22px;color:#0F1F2D;font-weight:600">You're invited to ${escapeHtml(businessName)}</h1>

          <p style="font-size:15px;line-height:1.6;color:#0F1F2D;margin:0 0 18px">
            <strong>${escapeHtml(inviterEmail)}</strong> added you as <strong>${escapeHtml(role)}</strong> on ZentraBite — the all-in-one dashboard their business runs on.
          </p>

          <div style="text-align:center;margin:24px 0 18px">
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:13px 26px;background:#00B67A;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Accept invite →</a>
          </div>

          <p style="font-size:13px;color:#6B7C93;margin:0;line-height:1.6">
            If the button doesn't work, paste this link into your browser:<br>
            <a href="${escapeHtml(actionLink)}" style="color:#00B67A;word-break:break-all">${escapeHtml(actionLink)}</a>
          </p>

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eceff4;font-size:12px;color:#6B7C93;line-height:1.6">
            Didn't expect this invite? Just ignore this email — no account will be created.
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

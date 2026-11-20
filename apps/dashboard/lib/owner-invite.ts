// ─── The owner's login ──────────────────────────────────────────────────────
// Makes the link the owner uses to set a password and log in to their shop's
// CRM, links their login to the shop, and emails it. Used when staff create a
// shop (POST /api/admin/onboarding) and from the wizard's go-live check
// (POST /api/admin/onboarding/[id]/owner-invite), for shops a seller sold.
//
// The link logs in as the owner, so only staff ever get it back. Sellers never
// do. Until Resend sends emails the email quietly doesn't go, so staff pass the
// link on themselves.
//
// A first link is a Supabase "invite". If the owner already has a login (a
// second link, or an email used before), it's a "magiclink" instead. A login
// that already belongs to a different shop is never moved to this one.

import "server-only";
import { sendEmail } from "@/lib/email";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any; auth: any };

export type OwnerInvite =
  | { ok: true; link: string; emailed: boolean; userId: string | null }
  | { ok: false; error: string };

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com").replace(/\/$/, "");

export async function inviteOwner(db: Db, input: {
  businessId: string; businessName: string; email: string;
  name?: string | null; phone?: string | null; invitedBy: string;
}): Promise<OwnerInvite> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "The owner's email isn't valid. Fix it in the Basics step." };
  const redirectTo = `${appUrl()}/login`;

  let link: string | null = null;
  let userId: string | null = null;
  for (const type of ["invite", "magiclink"] as const) {
    try {
      const { data, error } = await db.auth.admin.generateLink({ type, email, options: { redirectTo } });
      if (!error && data?.properties?.action_link) {
        link = data.properties.action_link as string;
        userId = (data.user?.id as string | undefined) ?? null;
        break;
      }
    } catch (err) {
      console.warn(`[owner-invite] generateLink (${type}) failed:`, err);
    }
  }
  if (!link) return { ok: false, error: "Couldn't make the owner's login link. Try again." };

  if (userId) {
    const { data: row } = await db.from("users").select("business_id").eq("id", userId).maybeSingle();
    if (row?.business_id && row.business_id !== input.businessId) {
      return { ok: false, error: "That email already logs in to a different shop. Use another email for this owner." };
    }
    await db.from("users").update({
      business_id: input.businessId,
      role:        "owner",
      ...(input.name?.trim()  ? { name:  input.name.trim() }  : {}),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    }).eq("id", userId);
  }

  // So the Team section of Settings shows them once they sign in.
  await db.from("business_members").upsert(
    { business_id: input.businessId, email, role: "Owner", invited_by: input.invitedBy, status: "invited" },
    { onConflict: "business_id,email" },
  ).then(() => undefined, () => undefined);

  const hi = input.name?.trim() ? input.name.trim().split(/\s+/)[0]! : "there";
  const sent = await sendEmail({
    to:      email,
    subject: `Your ZentraBite dashboard is ready for ${input.businessName}`,
    text: [
      `Hi ${hi},`, "",
      `${input.businessName} is set up on ZentraBite. Use this link to set your password and log in.`, "",
      link, "",
      "ZentraBite",
    ].join("\n"),
    html: welcomeHtml(input.businessName, hi, link),
  }).catch(() => ({ ok: false }));

  return { ok: true, link, emailed: Boolean((sent as { ok?: boolean }).ok), userId };
}

function welcomeHtml(businessName: string, ownerName: string, actionLink: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFB;padding:24px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;padding:32px 28px;box-shadow:0 1px 4px rgba(15,31,45,.06)">
        <tr><td>
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7C93;font-weight:600">ZentraBite</div>
          <h1 style="margin:4px 0 16px;font-size:22px;color:#0F1F2D;font-weight:600">Welcome, ${escapeHtml(ownerName)}</h1>
          <p style="font-size:15px;line-height:1.6;color:#0F1F2D;margin:0 0 18px">
            Your dashboard for <strong>${escapeHtml(businessName)}</strong> is set up and ready. Click below to set a password and log in.
          </p>
          <div style="text-align:center;margin:24px 0 18px">
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:13px 26px;background:#00AD82;color:#0F1F2D;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Set password and log in</a>
          </div>
          <p style="font-size:13px;color:#6B7C93;margin:0;line-height:1.6">
            Link not working? Paste it into your browser:<br>
            <a href="${escapeHtml(actionLink)}" style="color:#007457;word-break:break-all">${escapeHtml(actionLink)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

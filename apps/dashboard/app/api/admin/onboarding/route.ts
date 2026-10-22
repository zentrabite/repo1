// ─── POST /api/admin/onboarding ─────────────────────────────────────────────
// Sales-rep onboarding — step 1. Creates a new business row and sends the
// owner a magic-link invite email via /lib/email. All subsequent steps hit
// PATCH /api/admin/onboarding/[id] to merge more settings onto the same row.
//
// Body:
//   {
//     name: string,
//     type: string,
//     subdomain?: string,         // auto-suggested client-side; we re-validate here
//     suburb?: string,
//     ownerName?: string,
//     ownerEmail: string,
//     sendInvite?: boolean,        // default true
//     address?: string,
//     website?: string,
//     import?: ImportResult,       // draft from POST /api/admin/onboarding/import
//     importPermission?: true,     // owner agreed we can copy their website
//   }
//
// When an import is sent, its hours, brand colour and website go straight
// onto the business, and the rest (menu, logo choices, photos, "Check this"
// notes) is kept on settings.import for the later wizard steps.
//
// Returns: { businessId, inviteLink?: string }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email";
import { toStoredImport } from "@/lib/import/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  name:         string;
  type?:        string;
  subdomain?:   string;
  suburb?:      string;
  description?: string;
  contactPhone?: string;
  ownerName?:   string;
  ownerEmail:   string;
  ownerPhone?:  string;
  sendInvite?:  boolean;
  address?:     string;
  website?:     string;
  import?:      unknown;
  importPermission?: boolean;
};

const DEFAULT_HOURS = {
  mon: { open: "09:00", close: "21:00", closed: false },
  tue: { open: "09:00", close: "21:00", closed: false },
  wed: { open: "09:00", close: "21:00", closed: false },
  thu: { open: "09:00", close: "21:00", closed: false },
  fri: { open: "09:00", close: "22:00", closed: false },
  sat: { open: "09:00", close: "22:00", closed: false },
  sun: { open: "09:00", close: "21:00", closed: false },
};

function cleanWebsite(v: string | undefined): string | null {
  if (!v?.trim()) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch { return null; }
}

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const { name, type = "restaurant", suburb, ownerName, ownerEmail, ownerPhone, contactPhone, description } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Business name required" }, { status: 400 });
  if (!ownerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: "Valid owner email required" }, { status: 400 });
  }

  // Only keep an import when the rep confirmed the owner's permission.
  const stored = body.import && body.importPermission === true ? toStoredImport(body.import, user.id) : null;
  const website = cleanWebsite(body.website) ?? stored?.final_url ?? null;

  const db = createAdminClient();
  const wantSlug = (body.subdomain?.trim() || slugify(name));

  // Ensure subdomain is unique — append -2, -3 ... if taken.
  let subdomain = wantSlug;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await db
      .from("businesses")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (!existing) break;
    subdomain = `${wantSlug}-${i}`;
  }

  // Create the business. settings is seeded with the onboarding cursor so the
  // wizard can resume where the rep left off.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: biz, error } = await (db.from("businesses") as any)
    .insert({
      name:          name.trim(),
      type,
      suburb:        suburb?.trim() || null,
      subdomain,
      description:   description?.trim()   || null,
      contact_phone: contactPhone?.trim()  || null,
      contact_email: ownerEmail?.trim()    || null, // default to owner email; editable later
      address:       body.address?.trim().slice(0, 300) || null,
      website,
      settings: {
        onboarding: {
          step:          1,           // next step the rep should see
          started_by:    user.id,
          started_at:    new Date().toISOString(),
          owner_name:    ownerName ?? "",
          owner_email:   ownerEmail,
          owner_phone:   ownerPhone ?? "",
        },
        // Imported hours if we have them, else sensible defaults so a fresh
        // tenant isn't broken. The Hours step shows the import's notes.
        hours:         stored?.hours?.week ?? DEFAULT_HOURS,
        ...(contactPhone?.trim() ? { phone: contactPhone.trim() } : {}),
        ...(website ? { website } : {}),
        ...(stored?.colours ? { branding: { accent_color: stored.colours.suggested } } : {}),
        ...(stored && Object.keys(stored.social).length ? { social: stored.social } : {}),
        ...(stored ? { import: stored } : {}),
        gst_rate:      10,      // AU GST
        tip_options:   [5, 10, 15],
        service_fee_rate: 0,
      },
    })
    .select()
    .single();

  if (error || !biz) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  // Best-effort owner invite — don't fail the whole op if email send fails.
  let inviteLink: string | null = null;
  if (body.sendInvite !== false) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let authUserId: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: linkData } = await (db.auth as any).admin.generateLink({
        type:    "invite",
        email:   ownerEmail.trim(),
        options: { redirectTo: `${appUrl}/login` },
      });
      inviteLink = linkData?.properties?.action_link ?? null;
      authUserId = linkData?.user?.id ?? null;
    } catch (err) {
      console.warn("[onboarding] generateLink failed:", err);
    }

    // Backfill the public.users row (the auth trigger only captures id+email)
    // so that the About page shows the rep's entered name + phone immediately.
    if (authUserId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from("users") as any).update({
          business_id: biz.id,
          name:        ownerName?.trim()  || null,
          phone:       ownerPhone?.trim() || null,
          role:        "owner",
        }).eq("id", authUserId);
      } catch (err) {
        console.warn("[onboarding] update users row failed:", err);
      }
    }

    const actionLink = inviteLink ?? `${appUrl}/login`;
    const subject = `Your ZentraBite dashboard is ready — ${biz.name}`;
    const text = [
      `Hi ${ownerName ?? "there"},`,
      ``,
      `A ZentraBite rep just set up ${biz.name} for you.`,
      `Click the link below to set your password and log in.`,
      ``,
      actionLink,
      ``,
      `— ZentraBite`,
    ].join("\n");

    // Reuse the same template style as team invites for consistency.
    const html = welcomeHtml({
      businessName: biz.name,
      ownerName:    ownerName ?? "there",
      actionLink,
    });

    await sendEmail({ to: ownerEmail.trim(), subject, text, html });

    // Also record the owner in business_members so the Team section of
    // Settings shows them once they sign in.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("business_members") as any).upsert({
        business_id: biz.id,
        email:       ownerEmail.trim(),
        role:        "Owner",
        invited_by:  user.id,
        status:      "invited",
      }, { onConflict: "business_id,email" });
    } catch {
      /* table might not exist yet — migration is idempotent */
    }
  }

  return NextResponse.json({
    success:    true,
    businessId: biz.id,
    subdomain:  biz.subdomain,
    inviteLink,
  });
}

// ─── Template ───────────────────────────────────────────────────────────────

function welcomeHtml(input: { businessName: string; ownerName: string; actionLink: string }): string {
  const { businessName, ownerName, actionLink } = input;
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
            <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:13px 26px;background:#00B67A;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Set password & log in →</a>
          </div>
          <p style="font-size:13px;color:#6B7C93;margin:0;line-height:1.6">
            Link not working? Paste it into your browser:<br>
            <a href="${escapeHtml(actionLink)}" style="color:#00B67A;word-break:break-all">${escapeHtml(actionLink)}</a>
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

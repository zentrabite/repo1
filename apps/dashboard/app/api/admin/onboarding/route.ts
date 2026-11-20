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
//     menuUpload?: MenuRead,       // menu from photos, a PDF or text (POST /api/admin/onboarding/menu-read)
//   }
//
// When an import is sent, its hours, brand colour and website go straight
// onto the business, and the rest (menu, logo choices, photos, "Check this"
// notes) is kept on settings.import for the later wizard steps. A menu read
// from the owner's photos, PDF or text replaces the website's menu there
// (withUploadedMenu in lib/import/store.ts).
//
// Staff and sellers can call it (lib/seller-auth.ts). It records who made the
// sale (businesses.sold_by, sold_at, migration 022). For a seller it never
// invites the owner and never returns an invite link, because that link logs
// in as the owner. Staff send the invite during setup. A seller can create
// SELLER_SHOPS_PER_DAY shops a day.
//
// Every new shop gets the owner's Stripe setup link (lib/stripe-setup-link.ts),
// emailed to the owner so Stripe's ID and bank steps can be done before setup
// day. Staff get the link back to send themselves until Resend sends emails.
// A seller never does, because whoever finishes Stripe's setup picks the bank
// account the shop's money goes to.
//
// Returns: { businessId, inviteLink?: string, stripeLink?: string, stripeLinkEmailed: boolean }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSellerOrAdmin, dayAgo, SELLER_SHOPS_PER_DAY } from "@/lib/seller-auth";
import { checkAbn } from "@/lib/abn";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant";
import { emailSetupLink, newSetupLink } from "@/lib/stripe-setup-link";
import { inviteOwner } from "@/lib/owner-invite";
import { toStoredImport, withUploadedMenu } from "@/lib/import/store";

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
  abn?:         string;
  sendInvite?:  boolean;
  address?:     string;
  website?:     string;
  import?:      unknown;
  importPermission?: boolean;
  menuUpload?:  unknown;
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
  const who = await assertSellerOrAdmin();
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = { id: who.userId };

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const { name, type = "restaurant", suburb, ownerName, ownerEmail, ownerPhone, contactPhone, description } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Business name required" }, { status: 400 });
  if (!ownerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: "Valid owner email required" }, { status: 400 });
  }
  if (!who.isSuperAdmin && !ownerPhone?.trim()) {
    return NextResponse.json({ error: "Enter the owner's mobile, so the team can reach them" }, { status: 400 });
  }
  const abn = checkAbn(body.abn);
  if (!abn.ok) return NextResponse.json({ error: abn.error }, { status: 400 });
  // Staff send the owner's invite during setup. A seller never gets the link.
  const sendInvite = who.isSuperAdmin && body.sendInvite !== false;

  // Only keep an import when the rep confirmed the owner's permission.
  const fromSite = body.import && body.importPermission === true ? toStoredImport(body.import, user.id) : null;
  // A menu read from the owner's photos, PDF or text replaces the website's menu.
  const stored = body.menuUpload ? withUploadedMenu(fromSite, body.menuUpload, user.id) : fromSite;
  const website = cleanWebsite(body.website) ?? (stored?.final_url || null);

  const db = createAdminClient();

  if (!who.isSuperAdmin) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countErr } = await (db.from("businesses") as any).select("id", { count: "exact", head: true })
      .eq("sold_by", who.userId).gte("sold_at", dayAgo());
    if (countErr) return NextResponse.json({ error: "Couldn't check your sales. Try again." }, { status: 500 });
    if ((count ?? 0) >= SELLER_SHOPS_PER_DAY) {
      return NextResponse.json({ error: `That's ${SELLER_SHOPS_PER_DAY} shops today, the most a seller can add. Ask the ZentraBite team to add more.` }, { status: 429 });
    }
  }

  const wantSlug = slugify(body.subdomain?.trim() || name) || "shop";

  // Ensure subdomain is unique — append -2, -3 ... if taken. Our own names
  // (www, dashboard, admin...) count as taken, or the shop's address would
  // never reach it.
  let subdomain = wantSlug;
  for (let i = 2; i < 50; i++) {
    const reserved = RESERVED_SUBDOMAINS.has(subdomain);
    const { data: existing } = reserved ? { data: true } : await db
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
      abn:           abn.abn,
      website,
      sold_by:       who.userId,
      sold_at:       new Date().toISOString(),
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
    console.error("[onboarding] insert failed:", error?.message);
    return NextResponse.json({ error: who.isSuperAdmin ? error?.message ?? "Insert failed" : "Couldn't add the shop. Try again." }, { status: 500 });
  }

  // Best-effort owner invite (lib/owner-invite.ts). A failure doesn't undo the
  // shop: staff can send the login from the wizard's go-live check.
  let inviteLink: string | null = null;
  if (sendInvite) {
    const invite = await inviteOwner(db as never, {
      businessId: biz.id, businessName: biz.name, email: ownerEmail,
      name: ownerName, phone: ownerPhone, invitedBy: user.id,
    });
    if (invite.ok) inviteLink = invite.link;
    else console.warn("[onboarding] owner invite failed:", invite.error);
  }

  // The owner's Stripe link. A failure here doesn't undo the sale: staff can
  // make a new link from the wizard's Payments step.
  let stripeLink: string | null = null;
  let stripeLinkEmailed = false;
  try {
    const link = await newSetupLink(db, biz.id, user.id);
    stripeLink = link.url;
    stripeLinkEmailed = await emailSetupLink(ownerEmail, ownerName, biz.name ?? name.trim(), link.url);
  } catch (err) {
    console.error("[onboarding] Stripe link:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    success:    true,
    businessId: biz.id,
    subdomain:  biz.subdomain,
    inviteLink,
    // Staff only. A seller never gets the link.
    stripeLink: who.isSuperAdmin ? stripeLink : null,
    stripeLinkEmailed,
  });
}

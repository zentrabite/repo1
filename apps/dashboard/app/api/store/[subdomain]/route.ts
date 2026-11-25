// GET /api/store/[subdomain] — public endpoint, returns business + menu.
// ?code= adds what that win-back offer code gives (offer) or why it can't be
// used (offer_problem), so the ordering page can show it. Checkout checks the
// code again.
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { readOrderingRules, shopDate } from "@/lib/pickup-times";
import { checkCode, cleanCode, offerLabel } from "@/lib/offer-codes";
import { readFirstOrderOffer } from "@/lib/first-order";
import { readDeliveryRules } from "@/lib/own-delivery";

export async function GET(req: Request, { params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const db = createServerClient();

  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("id, name, type, suburb, logo_url, subdomain, contact_phone, settings, stripe_account_id, stripe_charges_enabled")
    .eq("subdomain", subdomain)
    .is("suspended_at", null) // a suspended shop's ordering page is off (041)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const [catsRes, itemsRes] = await Promise.all([
    db.from("menu_categories").select("*").eq("business_id", business.id).order("sort_order"),
    db.from("menu_items").select("*").eq("business_id", business.id).eq("available", true).order("sort_order"),
  ]);

  const cats  = catsRes.data  ?? [];
  const items = itemsRes.data ?? [];

  const menu = cats.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id),
  }));

  // Include uncategorised items under "General"
  const uncategorised = items.filter(i => !i.category_id || !cats.find(c => c.id === i.category_id));
  if (uncategorised.length > 0) menu.push({ id: "__general__", name: "General", sort_order: 999, business_id: business.id, items: uncategorised } as any);

  // Only the public bits of settings go to the browser.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (business.settings ?? {}) as Record<string, any>;
  const accent = typeof settings.branding?.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(settings.branding.accent_color)
    ? settings.branding.accent_color : null;
  const publicBusiness = {
    id:            business.id,
    name:          business.name,
    type:          business.type,
    suburb:        business.suburb,
    logo_url:      business.logo_url,
    subdomain:     business.subdomain,
    phone:         business.contact_phone ?? (typeof settings.phone === "string" ? settings.phone : null),
    accent_color:  accent,
    taking_orders: Boolean(business.stripe_account_id && business.stripe_charges_enabled),
    has_website:   settings.site?.published === true,
    // Opening hours, prep time and the pause switch, so the page can offer
    // pick-up times. Checkout checks them again. now lets the page allow for
    // a phone whose clock is off.
    ordering: (() => {
      const r = readOrderingRules(settings);
      const d = readDeliveryRules(settings);
      return {
        hours: r.week, timezone: r.timezone, prep_minutes: r.prepMinutes, paused: r.paused, now: new Date().toISOString(),
        // Delivery by the shop's own drivers. Only what the page needs.
        delivery: d.enabled ? { fee: d.fee, min_order: d.minOrder, extra_minutes: d.extraMinutes, areas: d.areas } : null,
        // The first order offer, if the shop runs one (lib/first-order.ts). Checkout decides who gets it.
        first_order: (() => { const o = readFirstOrderOffer(settings); return o.enabled ? { amount: o.amount, min_order: o.minOrder } : null; })(),
      };
    })(),
  };

  // A win-back code from the link, if there is one.
  const rawCode = new URL(req.url).searchParams.get("code");
  let offer: { code: string; type: string; value: number; label: string; ends: string } | null = null;
  let offerProblem: string | null = null;
  if (rawCode) {
    const code = cleanCode(rawCode);
    const checked = code ? await checkCode(db, business.id as string, code) : null;
    if (checked?.ok) {
      offer = {
        code: checked.row.code, type: checked.offer.type, value: checked.offer.value,
        label: offerLabel(checked.offer), ends: shopDate(new Date(checked.row.expires_at), publicBusiness.ordering.timezone),
      };
    } else {
      offerProblem = checked?.error ?? "That offer code isn't one of ours. Check the link in your message.";
    }
  }

  return NextResponse.json({ business: publicBusiness, menu, offer, offer_problem: offerProblem });
}

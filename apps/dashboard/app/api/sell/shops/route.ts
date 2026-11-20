// ─── GET /api/sell/shops ────────────────────────────────────────────────────
// The shops the logged-in seller sold, newest first, with how far setup has
// got. Only what a seller needs to follow up: no customers, orders, money or
// settings. Staff see the shops they added themselves.
//
// Returns: { shops: [{ id, name, address, sold_at, step, steps, stripe, live }] }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSellerOrAdmin } from "@/lib/seller-auth";
import { ROOT_DOMAIN } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The onboarding wizard has nine steps. */
const SETUP_STEPS = 9;

export async function GET() {
  const who = await assertSellerOrAdmin();
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient().from("businesses") as any)
    .select("id, name, subdomain, sold_at, created_at, stripe_charges_enabled, settings")
    .eq("sold_by", who.userId)
    .order("sold_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[sell/shops]", error.message);
    return NextResponse.json({ error: "Couldn't load your shops. Try again." }, { status: 500 });
  }

  type Row = { id: string; name: string; subdomain: string; sold_at: string | null; created_at: string; stripe_charges_enabled: boolean | null; settings: Record<string, unknown> | null };
  const shops = ((data ?? []) as Row[]).map(b => {
    const settings = b.settings ?? {};
    const onboarding = (settings.onboarding ?? {}) as { step?: unknown };
    const site = (settings.site ?? {}) as { published?: unknown };
    const step = Math.min(SETUP_STEPS, Math.max(1, Number(onboarding.step) || 1));
    const stripe = Boolean(b.stripe_charges_enabled);
    return {
      id:      b.id,
      name:    b.name,
      address: `${b.subdomain}.${ROOT_DOMAIN}`,
      sold_at: b.sold_at ?? b.created_at,
      step,
      steps:   SETUP_STEPS,
      stripe,
      live:    stripe && site.published === true,
    };
  });
  return NextResponse.json({ shops });
}

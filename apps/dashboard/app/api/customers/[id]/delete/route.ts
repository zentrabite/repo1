// ─── POST /api/customers/[id]/delete ────────────────────────────────────────
// Deletes a customer's details when they ask (migration 037, erase_customer).
//
// Body: { business_id?: string, confirm: true }
//
// Who: owners and managers. It can't be undone.
// What goes: name, phone, email, birthday, consent details and points, each
// order's delivery address and note, what every text and email said and where
// it went, their reviews, and the customer's details in the owner's order
// alerts. What stays: each order's amount, items and date, because the shop
// needs its sales for tax. The row stays as "Deleted customer", opted out, so
// nothing can be sent to it.
//
// Not covered here, and the confirm box says so. The shop's own Stripe
// account keeps the card payments with whatever the customer typed at
// checkout, and the owner deletes those in Stripe if asked.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { ok: boolean; error?: string; orders?: number; texts?: number; reviews?: number };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { business_id?: unknown; confirm?: unknown };

  // The shop comes from the login, never the body (see request-business).
  const auth = await requireBusiness(typeof body.business_id === "string" ? body.business_id : null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  if (!UUID.test(id)) return NextResponse.json({ error: "Pick a customer." }, { status: 400 });
  if (body.confirm !== true) return NextResponse.json({ error: "Tick the box to say you understand it can't be undone." }, { status: 400 });

  const { data, error } = await createAdminClient().rpc("erase_customer", { p_business: auth.businessId, p_customer: id });
  if (error || !data) return NextResponse.json({ error: "Couldn't delete their details. Try again." }, { status: 500 });
  const r = data as Result;
  if (!r.ok) return NextResponse.json({ error: "That customer isn't in this shop, or was already deleted." }, { status: 404 });
  return NextResponse.json(r);
}

// GET /api/admin/stats — returns aggregated stats for all businesses.
// Super-admin only. Uses the service-role client to bypass RLS, so the
// assertSuperAdmin() check below is the only thing keeping every tenant's
// Stripe ids, owner contact details and revenue private.
import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { getAllBusinessesStats } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const data = await getAllBusinessesStats();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/stats]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}

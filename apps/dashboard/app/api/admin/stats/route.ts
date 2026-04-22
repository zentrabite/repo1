// GET /api/admin/stats — returns aggregated stats for all businesses.
// Server-only: uses service-role client to bypass RLS.
import { NextResponse } from "next/server";
import { getAllBusinessesStats } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllBusinessesStats();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

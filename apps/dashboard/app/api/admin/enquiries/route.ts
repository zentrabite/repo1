// ─── /api/admin/enquiries ───────────────────────────────────────────────────
// GET ?before=<ISO date>  → { enquiries, hasMore, newCount }
// Contact form enquiries, newest first, a page at a time. Super admin only.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Everything the page shows. ip_hash stays in the database.
const COLUMNS =
  "id, created_at, name, email, phone, business_name, business_type, locations, current_tools, modules, message, source, status";

export async function GET(req: Request) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // The created_at of the last row already shown. Passed to Postgres as is so
  // the microseconds survive (a JS Date would round them off).
  const before = new URL(req.url).searchParams.get("before");
  if (before && (before.length > 40 || Number.isNaN(Date.parse(before)))) {
    return NextResponse.json({ error: "before must be a date" }, { status: 400 });
  }

  const db = createAdminClient();
  let query = db.from("enquiries").select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);

  const [listRes, newRes] = await Promise.all([
    query,
    db.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  if (listRes.error) {
    console.error("[admin/enquiries] list failed:", listRes.error.message);
    return NextResponse.json({ error: "Couldn't load enquiries" }, { status: 500 });
  }

  const rows = listRes.data ?? [];
  return NextResponse.json({
    enquiries: rows.slice(0, PAGE_SIZE),
    hasMore: rows.length > PAGE_SIZE,
    newCount: newRes.count ?? null,
  });
}

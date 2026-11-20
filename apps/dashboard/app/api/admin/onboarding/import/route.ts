// ─── POST /api/admin/onboarding/import ──────────────────────────────────────
// Reads a restaurant's own website and returns a draft for the onboarding
// wizard. Nothing is saved here: the rep checks the draft, and the create call
// (POST /api/admin/onboarding) stores what they keep.
//
// Body:    { url: string, permission: true }
//          permission = the owner has said we can copy their website content.
// Returns: { result: ImportResult }  (see lib/import/types.ts)
//
// Staff and sellers (lib/seller-auth.ts) can run it. Each run is recorded in
// import_runs (migration 022). A seller gets SELLER_IMPORTS_PER_DAY a day,
// because each one costs AI time.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSellerOrAdmin, dayAgo, SELLER_IMPORTS_PER_DAY } from "@/lib/seller-auth";
import { runImport } from "@/lib/import/run";
import { ImportFetchError } from "@/lib/import/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reading a long menu can take a couple of minutes. Hobby plan allows 300s.
export const maxDuration = 300;

export async function POST(req: Request) {
  const who = await assertSellerOrAdmin();
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { url?: unknown; permission?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Paste the restaurant's website address" }, { status: 400 });
  if (url.length > 2000) return NextResponse.json({ error: "That link is too long" }, { status: 400 });
  if (body.permission !== true) {
    return NextResponse.json({ error: "Tick the box to confirm the owner is happy for us to copy their website" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  if (!who.isSuperAdmin) {
    const { count, error } = await db.from("import_runs").select("id", { count: "exact", head: true })
      .eq("user_id", who.userId).gte("created_at", dayAgo());
    if (error) return NextResponse.json({ error: "Couldn't check your imports. Try again." }, { status: 500 });
    if ((count ?? 0) >= SELLER_IMPORTS_PER_DAY) {
      return NextResponse.json({ error: `That's ${SELLER_IMPORTS_PER_DAY} imports today, the most a seller can run. Fill the form in by hand, or try tomorrow.` }, { status: 429 });
    }
  }
  const { error: logErr } = await db.from("import_runs").insert({ user_id: who.userId, url: url.slice(0, 500) });
  if (logErr) console.warn("[onboarding/import] couldn't record the run:", logErr.message);

  try {
    const result = await runImport(url, { deadlineMs: (maxDuration - 15) * 1000 });
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof ImportFetchError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error("[onboarding/import] failed:", err);
    return NextResponse.json({ error: "Import failed. Try again, or fill the form in by hand." }, { status: 500 });
  }
}

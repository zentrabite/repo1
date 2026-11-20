// ─── GET /api/admin/setup-board ─────────────────────────────────────────────
// Every shop that isn't live yet, with what it's waiting for (lib/setup-board.ts).
// Super admins only.
//
// Returns: { shops: BoardShop[], live: number }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { readSetupBoard } from "@/lib/setup-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await readSetupBoard(createAdminClient() as never));
  } catch (err) {
    console.error("[setup-board]", err);
    return NextResponse.json({ error: "Couldn't load the setup board. Try again." }, { status: 500 });
  }
}

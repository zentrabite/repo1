// ─── POST /api/admin/onboarding/menu-read ───────────────────────────────────
// Reads a menu the owner gave us: photos, a PDF or pasted text. For shops
// whose menu isn't on their website. Returns a menu draft and saves nothing.
// The handover form sends the draft back when it creates the shop, and the
// wizard's menu step loads it into its editor.
//
// Body:    multipart form. "files" (up to 5 photos or PDFs) and/or "text".
//          The browser shrinks photos first (components/menu-upload.tsx).
// Returns: { result: MenuRead }  (see lib/import/types.ts)
//
// Staff and sellers can run it. It counts towards a seller's daily imports
// (import_runs, migration 022), because each read costs AI time.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSellerOrAdmin, dayAgo, SELLER_IMPORTS_PER_DAY } from "@/lib/seller-auth";
import { MENU_UPLOAD, MenuUploadError, readMenuUpload, type UploadFile } from "@/lib/import/menu-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A long menu can take a couple of minutes to read. Hobby plan allows 300s.
export const maxDuration = 300;

export async function POST(req: Request) {
  const who = await assertSellerOrAdmin();
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Vercel stops bodies over 4.5 MB before they get here. This catches the rest.
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MENU_UPLOAD.maxTotalBytes + 200_000) {
    return NextResponse.json({ error: "That's too much for one go. Try fewer photos or a smaller PDF." }, { status: 413 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Couldn't read what was sent. Try again." }, { status: 400 }); }

  const files: UploadFile[] = [];
  for (const v of form.getAll("files")) {
    if (typeof v === "string") continue;
    if (files.length >= MENU_UPLOAD.maxFiles) {
      return NextResponse.json({ error: `Add ${MENU_UPLOAD.maxFiles} files at most in one go.` }, { status: 400 });
    }
    files.push({ name: v.name, type: v.type, data: Buffer.from(await v.arrayBuffer()) });
  }
  const textRaw = form.get("text");
  const text = typeof textRaw === "string" ? textRaw : "";
  if (!files.length && !text.trim()) {
    return NextResponse.json({ error: "Add a photo or PDF of the menu, or paste it in." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  if (!who.isSuperAdmin) {
    const { count, error } = await db.from("import_runs").select("id", { count: "exact", head: true })
      .eq("user_id", who.userId).gte("created_at", dayAgo());
    if (error) return NextResponse.json({ error: "Couldn't check your imports. Try again." }, { status: 500 });
    if ((count ?? 0) >= SELLER_IMPORTS_PER_DAY) {
      return NextResponse.json({ error: `That's ${SELLER_IMPORTS_PER_DAY} imports and menu reads today, the most a seller can run. Leave the menu for the team, or try tomorrow.` }, { status: 429 });
    }
  }

  try {
    // Checks the files before the run is counted, so a wrong file type doesn't use up a read.
    const result = await readMenuUpload(files, text, {
      timeoutMs: (maxDuration - 15) * 1000,
      onStart: async () => {
        const what = [files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : "", text.trim() ? "pasted text" : ""].filter(Boolean).join(" and ");
        const { error } = await db.from("import_runs").insert({ user_id: who.userId, url: `menu upload: ${what}` });
        if (error) console.warn("[onboarding/menu-read] couldn't record the run:", error.message);
      },
    });
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof MenuUploadError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[onboarding/menu-read] failed:", err);
    return NextResponse.json({ error: "Couldn't read the menu. Try again, or type it in." }, { status: 500 });
  }
}

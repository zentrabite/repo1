// ─── POST /api/admin/onboarding/[id]/logo ───────────────────────────────────
// Two ways in:
//   • multipart form upload with a `file` field (rep uploads an image), or
//   • JSON { url } to use a logo found by the website import. Only URLs the
//     import found for this business are accepted.
// Stores the file in Supabase Storage and writes businesses.logo_url.
// Piggy-backs on the existing "menu-images" bucket with a `logos/` prefix so
// we don't need another bucket.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { checkImage } from "@/lib/image-check";
import { ImportFetchError, safeFetch } from "@/lib/import/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: businessId } = await params;
  const db = createAdminClient();
  let buffer: Buffer;

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    const { data: biz } = await db.from("businesses").select("settings").eq("id", businessId).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowed: string[] = ((biz?.settings as any)?.import?.logo_candidates ?? []) as string[];
    if (!url || !allowed.includes(url)) {
      return NextResponse.json({ error: "That logo wasn't found by the import for this business" }, { status: 400 });
    }
    try {
      const doc = await safeFetch(url, { maxBytes: MAX_BYTES, timeoutMs: 15_000, accept: "image/png,image/jpeg,image/webp,image/*;q=0.8" });
      buffer = doc.body;
    } catch (err) {
      const msg = err instanceof ImportFetchError ? err.message : "Couldn't download that logo";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  } else {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    buffer = Buffer.from(await file.arrayBuffer());
  }

  // Real file type from the bytes. SVG is refused because it can carry scripts.
  const image = checkImage(buffer, ["png", "jpg", "webp"]);
  if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

  const path = `logos/${businessId}/${Date.now()}.${image.kind}`;

  const { error: uploadErr } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: image.contentType,
    upsert: false,
  });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from("businesses") as any).update({ logo_url: publicUrl }).eq("id", businessId);

  return NextResponse.json({ success: true, logo_url: publicUrl });
}

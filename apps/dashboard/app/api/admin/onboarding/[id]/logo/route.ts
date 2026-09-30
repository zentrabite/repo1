// ─── POST /api/admin/onboarding/[id]/logo ───────────────────────────────────
// Multipart form upload. Stores the file in Supabase Storage and writes
// businesses.logo_url. Piggy-backs on the existing "menu-images" bucket with
// a `logos/` prefix so we don't need another bucket.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { checkImage } from "@/lib/image-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "menu-images";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id: businessId } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  // Real file type from the bytes. SVG is refused because it can carry scripts.
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = checkImage(buffer, ["png", "jpg", "webp"]);
  if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

  const path = `logos/${businessId}/${Date.now()}.${image.kind}`;
  const db = createAdminClient();

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

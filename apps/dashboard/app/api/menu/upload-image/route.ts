// POST /api/menu/upload-image — uploads a menu item photo to Supabase Storage
// Returns the public URL of the uploaded file.
//
// Security
//   • The business comes from the login, never the form field.
//   • The file type is read from the file's own bytes (PNG, JPG, WEBP, GIF).
//     A renamed file or an SVG is refused.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";
import { checkImage } from "@/lib/image-check";

const BUCKET = "menu-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedBusinessId = formData.get("business_id") as string | null;

    const auth = await requireBusiness(requestedBusinessId);
    if (!auth.ok) return auth.response;
    const { businessId } = auth;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = checkImage(buffer);
    if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

    const path = `${businessId}/${Date.now()}.${image.kind}`;
    const db = createAdminClient();

    const { error: uploadErr } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: image.contentType,
      upsert: false,
    });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

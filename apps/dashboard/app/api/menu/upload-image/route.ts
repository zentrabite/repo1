// POST /api/menu/upload-image — uploads a menu item photo to Supabase Storage
// Returns the public URL of the uploaded file.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

const BUCKET = "menu-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowed.includes(ext)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

    const path = `${businessId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const db = createAdminClient();

    // Ensure the bucket exists (idempotent)
    const { data: buckets } = await db.storage.listBuckets();
    if (!buckets?.find(b => b.name === BUCKET)) {
      await db.storage.createBucket(BUCKET, { public: true });
    }

    const { error: uploadErr } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

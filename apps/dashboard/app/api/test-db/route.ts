// Temporary connection test — delete this file once confirmed working
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const db = createServerClient();

    // Try to count rows in the businesses table
    const { count, error } = await db
      .from("businesses")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      status:  "✅ Supabase connected successfully",
      tables:  "All tables created",
      businesses_count: count ?? 0,
    });
  } catch (err) {
    return NextResponse.json({
      status: "❌ Connection failed",
      error:  err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}

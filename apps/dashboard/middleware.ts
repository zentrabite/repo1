// Middleware disabled — auth is handled client-side in dashboard-shell.tsx
// Re-enable with @supabase/ssr cookie-based sessions before going to production.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

// ─── GET /api/sending ─────────────────────────────────────────────────────────
// Whether the logged-in shop's marketing texts or emails are paused by a stop
// rule or by staff (lib/send-guard.ts), with a plain reason, for the notice
// on the Win-Back and Automations pages. Read only.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";
import { activePauses } from "@/lib/send-guard";
import { channelLabel, describePause } from "@/lib/stop-rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireBusiness();
  if (!auth.ok) return auth.response;
  const pauses = await activePauses(createAdminClient(), auth.businessId);
  return NextResponse.json({
    pauses: pauses.map(p => ({
      channel:  p.channel,
      label:    p.scope === "all" ? "All texts" : channelLabel(p.channel),
      everyShop: p.business_id === null,
      // An "every text" kill switch stops order texts too.
      allTexts: p.scope === "all",
      reason:   p.business_id === null ? "Paused for every shop by the ZentraBite team." : describePause(p.channel, p.reason, p.detail),
      since:    p.paused_at,
    })),
  });
}

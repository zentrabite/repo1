// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Win-Back Edge Function (switched off, 21 Nov 2026)
//
// This used to text lapsed customers every day. Its texts promised money off
// with a code that was never saved, so checkout charged full price. Win-back
// is now sent only by the CRM's daily run (apps/dashboard/app/api/
// automations/run), which gives each message a real one-use code
// (lib/offer-codes.ts). Migration 025 switched off the cron job that called
// this function.
//
// It stays deployed as this stub so an old caller gets a clear answer and
// nothing is sent. Deploy: supabase functions deploy win-back
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(() =>
  new Response(
    JSON.stringify({ sent: 0, message: "Win-back is sent by the CRM now (/api/automations/run). This function does nothing." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — quick-api (switched off, 21 Nov 2026)
//
// An April 2026 leftover that was deployed but never in the repo. It sent
// win-back texts to anyone not opted out (it ignored marketing consent),
// with codes that were never saved, to an old .com.au address. Nothing
// called it. Win-back is sent only by the CRM's daily run now
// (apps/dashboard/app/api/automations/run).
//
// It stays deployed as this stub so nothing can run the old code.
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(() =>
  new Response(
    JSON.stringify({ message: "Switched off. Win-back is sent by the CRM (/api/automations/run)." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  ),
);

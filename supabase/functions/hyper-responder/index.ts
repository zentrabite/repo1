// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — hyper-responder (switched off, 21 Nov 2026)
//
// An April 2026 leftover that was deployed but never in the repo. It was an
// early copy of the nightly analytics job (supabase/functions/
// nightly-analytics), which is the one the cron job runs. Nothing called it.
//
// It stays deployed as this stub so nothing can run the old code.
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(() =>
  new Response(
    JSON.stringify({ message: "Switched off. Nightly analytics runs from the nightly-analytics function." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  ),
);

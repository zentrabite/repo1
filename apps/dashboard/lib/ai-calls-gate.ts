// Outbound AI phone calls (/api/ai-calls/start) stay switched off until the
// rules for calling people are built. A call to a customer is telemarketing,
// so before this turns on it needs, at least:
//   • a check against the Do Not Call Register,
//   • calling hours in the customer's time zone,
//   • the kill switches and stop rules that texts and emails already obey,
//   • a voice provider and the status callback (/api/ai-calls/webhook).
// Found in the second security run (24 Nov 2026). Flip this only with all four.

export const AI_CALLS_READY = false;

export const AI_CALLS_OFF =
  "AI calls aren't switched on yet. They need the Do Not Call Register check, calling hours and the kill switches first.";

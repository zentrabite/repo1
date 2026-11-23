// ─── Who at ZentraBite opened a shop's CRM ──────────────────────────────────
// A super admin can open any shop's CRM as its owner. Every start and stop is
// written to staff_access_log (migration 036), and so is the first use of
// the CRM as a shop in each 4-hour window, the impersonation cookie's life,
// so use without the Impersonate button is recorded too.
//
// The shop's owner and managers see the list in Settings (/api/access-log),
// and staff see it on the shop's Super Admin page.
// Writing never throws. A failed write is logged, and the request goes on.

import "server-only";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type AccessAction = "start" | "used" | "stop";
export type AccessRow = { action: AccessAction; staff_email: string | null; created_at: string; what: string };

const WINDOW_MS = 4 * 60 * 60 * 1000;

export async function logAccess(db: Db, row: { businessId: string; staffId: string; staffEmail: string | null; action: AccessAction }): Promise<void> {
  try {
    const { error } = await db.from("staff_access_log").insert({
      business_id: row.businessId, staff_id: row.staffId, staff_email: row.staffEmail, action: row.action,
    });
    if (error) console.error("[access-log]", error.message);
  } catch (err) {
    console.error("[access-log]", err instanceof Error ? err.message : err);
  }
}

/** Records use of a shop's CRM as staff, once per 4 hours per person and shop. */
export async function noteStaffUse(db: Db, businessId: string, staffId: string, staffEmail: string | null, now = Date.now()): Promise<void> {
  try {
    const { data, error } = await db.from("staff_access_log").select("id")
      .eq("business_id", businessId).eq("staff_id", staffId)
      .gte("created_at", new Date(now - WINDOW_MS).toISOString())
      .limit(1);
    if (error) { console.error("[access-log]", error.message); return; }
    if ((data ?? []).length > 0) return;
  } catch (err) {
    console.error("[access-log]", err instanceof Error ? err.message : err);
    return;
  }
  await logAccess(db, { businessId, staffId, staffEmail, action: "used" });
}

/** The latest visits to a shop, newest first. */
export async function recentAccess(db: Db, businessId: string, limit = 20): Promise<AccessRow[]> {
  const { data, error } = await db.from("staff_access_log")
    .select("action, staff_email, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Omit<AccessRow, "what">[]).map(r => ({ ...r, what: describeAccess(r.action) }));
}

/** Plain words for a row, for both lists. */
export function describeAccess(action: AccessAction): string {
  if (action === "start") return "Opened the CRM as the owner";
  if (action === "stop") return "Closed it";
  return "Used the CRM as the owner";
}

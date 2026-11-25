// Courier keys (Uber Direct, DoorDash Drive, Sherpa, Zoom2u, GoPeople).
//
// They live in business_secrets (038), which only the server can read. The
// browser only ever learns whether each one is saved, through
// /api/delivery/keys. Never put them back in businesses: every team member
// can read that row, and a trigger strips them out anyway.

import "server-only";
import type { ProviderCredentials } from "@/lib/delivery-providers";
import { COURIER_FIELDS, isCourierField, type CourierField, type CourierKeyStatus } from "@/lib/courier-fields";

export { COURIER_FIELDS, type CourierField, type CourierKeyStatus };

// Every courier field is a provider credential, and the other way round.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _same: Same<CourierField, keyof ProviderCredentials> = true;
void _same;

const MAX_LENGTH = 2000;

type Db = { from: (table: string) => any };

function clean(raw: unknown): ProviderCredentials {
  const out: ProviderCredentials = {};
  if (!raw || typeof raw !== "object") return out;
  for (const f of COURIER_FIELDS) {
    const v = (raw as Record<string, unknown>)[f];
    if (typeof v === "string" && v.trim()) out[f] = v.trim();
  }
  return out;
}

/** The shop's saved keys, for the delivery routes on the server only. */
export async function readCourierKeys(db: Db, businessId: string): Promise<ProviderCredentials> {
  const { data, error } = await db.from("business_secrets").select("courier").eq("business_id", businessId).maybeSingle();
  if (error) throw new Error(error.message);
  return clean(data?.courier);
}

/** Saved or not, for each key. Never the key itself. */
export function keyStatus(keys: ProviderCredentials): CourierKeyStatus {
  return Object.fromEntries(COURIER_FIELDS.map(f => [f, Boolean(keys[f])])) as CourierKeyStatus;
}

export type KeyChange = { set: ProviderCredentials; clear: CourierField[] };

/**
 * Reads a save request. A typed value replaces that key, a field listed in
 * clear removes it, and anything left out stays as it is.
 */
export function readKeyChange(body: unknown): { ok: true; change: KeyChange } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Nothing to save" };
  const { set, clear } = body as { set?: unknown; clear?: unknown };
  const change: KeyChange = { set: {}, clear: [] };

  if (set !== undefined) {
    if (!set || typeof set !== "object" || Array.isArray(set)) return { ok: false, error: "Nothing to save" };
    for (const [k, v] of Object.entries(set)) {
      if (!isCourierField(k)) return { ok: false, error: `Unknown field ${k}` };
      if (typeof v !== "string") return { ok: false, error: `${k} must be text` };
      const value = v.trim();
      if (!value) continue;
      if (value.length > MAX_LENGTH) return { ok: false, error: `${k} is too long` };
      if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false, error: `${k} has characters a key can't have` };
      change.set[k] = value;
    }
  }
  if (clear !== undefined) {
    if (!Array.isArray(clear) || !clear.every(isCourierField)) return { ok: false, error: "Unknown field to remove" };
    change.clear = [...new Set(clear)];
  }
  if (!Object.keys(change.set).length && !change.clear.length) return { ok: false, error: "Nothing to save" };
  return { ok: true, change };
}

/** Applies a change and returns what's saved now. */
export async function saveCourierKeys(db: Db, businessId: string, change: KeyChange, by: string): Promise<CourierKeyStatus> {
  const now = await readCourierKeys(db, businessId);
  const next: ProviderCredentials = { ...now, ...change.set };
  for (const f of change.clear) delete next[f];
  const { error } = await db.from("business_secrets").upsert(
    { business_id: businessId, courier: next, updated_at: new Date().toISOString(), updated_by: by },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
  return keyStatus(next);
}

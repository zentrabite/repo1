// The courier key fields, shared by the Settings page and the server.
// The keys themselves are only ever read on the server (lib/courier-keys.ts).

export const COURIER_FIELDS = [
  "uber_direct_api_key", "uber_direct_customer_id",
  "doordash_developer_id", "doordash_key_id", "doordash_signing_secret",
  "sherpa_api_key", "zoom2u_api_key", "gopeople_api_key",
] as const;

export type CourierField = (typeof COURIER_FIELDS)[number];
export type CourierKeyStatus = Record<CourierField, boolean>;

export function isCourierField(name: unknown): name is CourierField {
  return typeof name === "string" && (COURIER_FIELDS as readonly string[]).includes(name);
}

/** A delivery settings object with any courier key taken out. */
export function withoutCourierKeys<T extends Record<string, unknown>>(settings: T): Omit<T, CourierField> {
  const out: Record<string, unknown> = { ...settings };
  for (const f of COURIER_FIELDS) delete out[f];
  return out as Omit<T, CourierField>;
}

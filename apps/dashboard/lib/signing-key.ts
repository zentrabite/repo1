// Keys for signing things only our server makes, derived with a label from
// zb_link_secret, a secret made inside Supabase Vault (migration 035) that
// nobody has seen. Only the server role can read it (link_signing_secret()).
// Each use gets its own label, so one key never signs two kinds of thing.
//   • unsubscribe links (lib/unsubscribe.ts)
//   • online checkouts (lib/checkout-signature.ts)

import "server-only";
import crypto from "node:crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

// Read once per server, then kept. A failed read is tried again next time.
const cache = new Map<string, Buffer>();

/** The key for one label, or null if the secret can't be read. */
export async function signingKey(db: Db, label: string): Promise<Buffer | null> {
  const hit = cache.get(label);
  if (hit) return hit;
  try {
    const { data, error } = await db.rpc("link_signing_secret");
    if (error || typeof data !== "string" || data.length < 32) return null;
    const key = keyFromSecret(data, label);
    cache.set(label, key);
    return key;
  } catch {
    return null;
  }
}

/** The same derivation, from the secret itself. */
export function keyFromSecret(secret: string, label: string): Buffer {
  return crypto.createHmac("sha256", secret).update(label).digest();
}

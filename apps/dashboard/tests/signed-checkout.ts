// Signs a test checkout session the way /api/store/checkout does, with the
// test secret fake-db.ts hands out for link_signing_secret.

import { CHECKOUT_LABEL, SIG_KEY, UNTIL_KEY, signWithKey } from "@/lib/checkout-signature";
import { keyFromSecret } from "@/lib/signing-key";

export const TEST_LINK_SECRET = "test-link-secret-".padEnd(64, "x");

export function signed<T extends { metadata?: Record<string, string> | null }>(session: T): T & { created: number } {
  const now = Math.floor(Date.now() / 1000);
  const meta: Record<string, string> = { ...(session.metadata ?? {}), [UNTIL_KEY]: String(now + 3600) };
  delete meta[SIG_KEY];
  const key = keyFromSecret(TEST_LINK_SECRET, CHECKOUT_LABEL);
  return { ...session, created: now, metadata: { ...meta, [SIG_KEY]: signWithKey(meta, key) } };
}

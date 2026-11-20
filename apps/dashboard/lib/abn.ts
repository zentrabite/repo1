// ─── Australian Business Number ─────────────────────────────────────────────
// Checks an ABN the way the ATO does: 11 digits, take 1 from the first, weight
// each digit, and the total must divide by 89. Catches most typos before a
// shop is set up with the wrong one. Pure, so the form and the server share it.

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** "51 824 753 556" for a valid ABN, null for an empty box, or an error. */
export function checkAbn(input: unknown): { ok: true; abn: string | null } | { ok: false; error: string } {
  const raw = typeof input === "string" ? input.replace(/[\s-]/g, "") : "";
  if (!raw) return { ok: true, abn: null };
  if (!/^\d{11}$/.test(raw)) return { ok: false, error: "An ABN has 11 digits." };
  const digits = raw.split("").map(Number);
  digits[0] = digits[0]! - 1;
  const total = digits.reduce((sum, d, i) => sum + d * WEIGHTS[i]!, 0);
  if (total % 89 !== 0) return { ok: false, error: "That ABN doesn't check out. Look for a typo." };
  return { ok: true, abn: `${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5, 8)} ${raw.slice(8)}` };
}

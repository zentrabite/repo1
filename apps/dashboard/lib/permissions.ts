// ─── Role-based permissions ─────────────────────────────────────────────────
// Owner sees everything — always. For every other role, the list below defines
// the default nav items they can reach. Owners can override per-role in
// Settings → Permissions; the override is stored in
// `businesses.settings.role_permissions` as Record<role, string[]> where the
// string array is the list of allowed nav hrefs.
//
// Rules:
//   • Owner is hard-coded to see everything (never checked against a list).
//   • Super admins bypass (they see admin pages that aren't in NAV_HREFS).
//   • Any other role uses the override list if present, else the default.
//   • An empty array means "no access to anything" — useful for suspending a
//     role temporarily without deleting it.

import { navigation } from "@/lib/navigation";

export const NAV_HREFS = navigation.map(n => n.href);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // Full run-the-shop role. Everything except Financials (P&L is owner-only).
  Manager: NAV_HREFS.filter(h => !["/financials", "/settings"].includes(h)).concat(["/settings"]),

  // Staff floor / kitchen — see their work, not the numbers.
  Staff: [
    "/dashboard",
    "/orders",
    "/fulfillment",
    "/menu",
    "/stock",
    "/customers",
    "/rostering",
  ],

  // POS terminal account — lock it down to just the till + order board.
  POS: [
    "/pos",
    "/orders",
  ],
};

export const ALL_ROLES = ["Owner", "Manager", "Staff", "POS"];

// Resolve the effective allow-list for a given role, taking overrides into
// account. Owner always returns the full list.
export function resolvePermissions(
  role: string | null | undefined,
  overrides: Record<string, string[]> | null | undefined,
  isSuperAdmin = false,
): string[] {
  if (isSuperAdmin) return NAV_HREFS;
  if (!role || role === "Owner") return NAV_HREFS;
  if (overrides && Array.isArray(overrides[role])) return overrides[role]!;
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

export function canAccess(
  href: string,
  role: string | null | undefined,
  overrides: Record<string, string[]> | null | undefined,
  isSuperAdmin = false,
): boolean {
  const allowed = resolvePermissions(role, overrides, isSuperAdmin);
  return allowed.includes(href);
}

// ─── /api/team ────────────────────────────────────────────────────────────────
// Settings → Team. Owners and managers list the team, change a member's role
// and remove a member. Inviting is /api/team/invite. The rules are in
// lib/team.ts. business_members is server only (030), so this is the only way
// the team changes.
//
//   GET    ?businessId=…                → { team: TeamRow[] }
//   PATCH  { businessId?, email, role } → change a member's role
//   DELETE { businessId?, email }       → remove a member. They lose the shop
//                                          on their next page load.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { findMember, listTeam, teamChangeProblem } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("businessId");
  const auth = await requireBusiness(requested, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  const team = await listTeam(createAdminClient(), auth.businessId, auth.email);
  return NextResponse.json({ team });
}

type Body = { businessId?: string; email?: string; role?: string };

async function readBody(req: Request): Promise<Body | null> {
  try {
    const b = (await req.json()) as Body;
    return b && typeof b === "object" ? b : null;
  } catch {
    return null;
  }
}

async function change(req: Request, remove: boolean) {
  const body = await readBody(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const role = remove ? undefined : typeof body?.role === "string" ? body.role : "";

  const auth = await requireBusiness(body?.businessId, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;

  const db = createAdminClient();
  const member = await findMember(db, auth.businessId, email);
  if (!member) return NextResponse.json({ error: "They aren't on this shop's team. The shop's owner can't be changed here." }, { status: 404 });

  const problem = teamChangeProblem({ role: auth.role, email: auth.email }, member, role);
  if (problem) return NextResponse.json({ error: problem }, { status: problem === "Unknown role." ? 400 : 403 });

  const { error } = await db
    .from("business_members")
    .update(remove ? { status: "removed" } : { role })
    .eq("business_id", auth.businessId)
    .eq("email", member.email);
  if (error) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  return change(req, false);
}

export async function DELETE(req: Request) {
  return change(req, true);
}

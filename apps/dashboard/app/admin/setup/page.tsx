"use client";

// ─── Super Admin → Setup board ──────────────────────────────────────────────
// Every shop that isn't live yet, oldest sale first, with the wizard step it's
// on and what it's waiting for. Uses /api/admin/setup-board (lib/setup-board.ts),
// which runs the go-live check for each shop.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";

type Gap = { key: string; label: string; detail: string };
type Shop = {
  id: string; name: string; suburb: string | null; soldBy: string | null; since: string; days: number; step: number;
  gaps: Gap[]; stripeLink: { opened: boolean; expired: boolean } | null;
};

const C = { g: "#00AD82", st: "#6B7C93", cl: "#F8FAFB", r: "#FF4757", y: "#FFC14B", mist: "rgba(226,232,240,.06)" };
const STEP_LABEL = ["", "Basics", "Hours", "Branding", "Menu", "Payments", "Delivery", "Notifications", "Website", "Team"];

// What the shop is waiting for, and on whom.
function waitingOn(s: Shop): { text: string; who: "owner" | "team" | null } {
  if (!s.gaps.length) return { text: "Ready to publish", who: "team" };
  const first = s.gaps[0]!;
  if (first.key === "payments") {
    const l = s.stripeLink;
    const more = !l ? " No Stripe link made yet." : l.expired ? " Their Stripe link has run out, so make a new one." : l.opened ? " They've opened their Stripe link." : " They haven't opened their Stripe link.";
    return { text: `Stripe setup.${more}`, who: "owner" };
  }
  return { text: first.label, who: "team" };
}

export default function SetupBoardPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useBusiness();
  const [data, setData] = useState<{ shops: Shop[]; live: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    let cancelled = false;
    fetch("/api/admin/setup-board")
      .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setError(body.error ?? "Couldn't load the setup board"); return; }
        setError(null);
        setData(body);
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the server"); });
    return () => { cancelled = true; };
  }, [loading, isSuperAdmin, router, tick]);

  if (loading || !isSuperAdmin) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading…</div>;

  const shops = data?.shops ?? [];
  const stuck = shops.filter(s => s.days >= 3 && s.step <= 1).length;

  return (
    <div style={{ maxWidth: 980 }}>
      <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: "8px 0", minHeight: 44 }}>
        ← Back to Super Admin
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: "0 0 4px" }}>Setup board</h2>
          <p style={{ color: C.st, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            {data
              ? `${shops.length} shop${shops.length === 1 ? "" : "s"} being set up, oldest first. ${data.live} live.${stuck ? ` ${stuck} sold 3 or more days ago and not started.` : ""}`
              : "Every shop that isn't live yet, oldest first."}
          </p>
        </div>
        <button className="bg-btn" onClick={() => setTick(t => t + 1)}>Refresh</button>
      </div>

      {error && <p role="alert" style={{ color: C.r, fontSize: 13 }}>{error}</p>}

      <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
        {data === null && !error ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Loading…</p>
        ) : shops.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Every shop is live. Nothing waiting.</p>
        ) : shops.map((s, i) => {
          const w = waitingOn(s);
          const late = s.days >= 3 && s.step <= 1;
          return (
            <Link key={s.id} href={`/admin/onboarding/${s.id}`} style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "14px 18px", borderTop: i ? `1px solid ${C.mist}` : "none", textDecoration: "none", minHeight: 44 }}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ color: C.cl, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ color: C.st, fontSize: 12, marginTop: 2 }}>
                  {[s.suburb, s.soldBy ? `sold by ${s.soldBy}` : "made by staff", s.days === 0 ? "today" : s.days === 1 ? "1 day ago" : `${s.days} days ago`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ flex: "0 0 140px", color: C.st, fontSize: 12 }}>
                {`Step ${s.step} of 9, ${STEP_LABEL[s.step] ?? ""}`}
              </div>
              <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: !s.gaps.length ? C.g : late ? C.r : C.y, fontWeight: 600 }}>
                  {late ? `Not started. ${w.text}` : w.text}
                </div>
                <div style={{ fontSize: 12, color: C.st, marginTop: 2 }}>
                  {s.gaps.length
                    ? `${s.gaps.length} to do: ${s.gaps.map(g => g.label).join(", ")}${w.who === "owner" ? ". Waiting on the owner." : ""}`
                    : "Everything in the go-live check passes."}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <p style={{ color: C.st, fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        {`A shop's own text sender name and its own domain aren't tracked here yet, because neither is set up through the CRM.`}
      </p>
    </div>
  );
}

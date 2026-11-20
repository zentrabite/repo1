"use client";

// ─── Your sales ─────────────────────────────────────────────────────────────
// A seller's home: the shops they sold, how far the team has got setting each
// one up, and the button for the next sale. Sellers see nothing else in the
// CRM (components/dashboard-shell.tsx sends them here). Data comes from
// GET /api/sell/shops, which checks the login is a seller or staff.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import { Icon } from "@/components/zb-icon";

type Shop = { id: string; name: string; address: string; sold_at: string; step: number; steps: number; stripe: boolean; live: boolean };

const C = { g:"#00AD82", st:"#6B7C93", cl:"#F8FAFB", r:"#FF4757" };

export default function SellPage() {
  // useSearchParams needs a Suspense boundary in Next 16.
  return <Suspense fallback={null}><Sales /></Suspense>;
}

function Sales() {
  const { loading, isSeller, isSuperAdmin } = useBusiness();
  const allowed = isSeller || isSuperAdmin;
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The shop just sent to the team, from the handover form.
  const search = useSearchParams();
  const added = search.get("added");
  const stripeEmailed = search.get("stripe") === "emailed";

  useEffect(() => {
    if (loading || !allowed) return;
    let cancelled = false;
    fetch("/api/sell/shops")
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Couldn't load your shops. Try again.");
        else setShops(data.shops ?? []);
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the server. Check your connection."); });
    return () => { cancelled = true; };
  }, [loading, allowed]);

  if (loading) return <p style={{ color: C.st, padding: "40px 0", textAlign: "center" }}>Loading…</p>;
  if (!allowed) {
    return (
      <div className="gc" style={{ padding: 24 }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 20, color: C.cl, margin: "0 0 8px" }}>This page is for ZentraBite sellers</h1>
        <p style={{ color: C.st, fontSize: 14, margin: 0 }}>Ask the ZentraBite team if you should have access. <Link href="/dashboard" style={{ color: C.g }}>Go to the CRM</Link></p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: 0 }}>Your sales</h1>
          <p style={{ color: C.st, fontSize: 14, margin: "4px 0 0" }}>Shops you&apos;ve signed, and how far the team has got setting them up.</p>
        </div>
        <Link href="/sell/new" className="bp" style={{ textDecoration: "none" }}><Icon name="plus" size={16} />New sale</Link>
      </div>

      {added && (
        <div role="status" style={{ background: "rgba(0,173,130,.1)", border: "1px solid rgba(0,173,130,.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, color: C.cl, fontSize: 14, lineHeight: 1.5 }}>
          {`${added} is with the team. They'll set it up and send the owner their login.`}
          {stripeEmailed
            ? " The owner has been emailed a link to set up payments with Stripe. Ask them to do it soon, so the shop can take orders on day one."
            : " The team will send the owner their link to set up payments with Stripe."}
        </div>
      )}

      {error && <p role="alert" style={{ color: C.r, fontSize: 14 }}>{error}</p>}
      {!error && shops === null && <p style={{ color: C.st, fontSize: 14 }}>Loading your shops…</p>}
      {shops && shops.length === 0 && (
        <div className="gc" style={{ padding: 24, color: C.st, fontSize: 14, lineHeight: 1.6 }}>
          No sales yet. When you sign a shop, tap New sale and fill it in with the owner.
        </div>
      )}
      {shops && shops.length > 0 && (
        <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
          {shops.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderTop: i ? "1px solid rgba(226,232,240,.06)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.cl, fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                <div style={{ color: C.st, fontSize: 12, marginTop: 2, overflowWrap: "anywhere" }}>
                  {s.address} · sold {new Date(s.sold_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {s.live
                  ? <span className="bd" style={{ background: "rgba(0,173,130,.12)", color: C.g }}>Live</span>
                  : <span className="bd" style={{ background: "rgba(245,158,11,.14)", color: "#F59E0B" }}>{`Setting up, step ${s.step} of ${s.steps}`}</span>}
                <span className="bd" style={{ background: "rgba(107,124,147,.14)", color: s.stripe ? C.g : C.st }}>{s.stripe ? "Payments on" : "Payments not on yet"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

// ─── Super Admin → Sending ───────────────────────────────────────────────────
// Marketing sends paused by the stop rules (lib/stop-rules.ts), why, and a
// Resume button. Uses /api/admin/sending. A pause only ever stops marketing.
// Receipts, order texts and login links still go.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";

type Item = { id: string; shop: string; channel: "sms" | "email"; label: string; why: string; pausedAt: string; pausedBy: string; resumedAt: string | null };
type Data = { open: Item[]; resumed: Item[] };

const C = { g: "#00AD82", st: "#6B7C93", cl: "#F8FAFB", r: "#FF4757", y: "#FFC14B", mist: "rgba(226,232,240,.06)" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Adelaide", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function SendingPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useBusiness();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!isSuperAdmin) { router.replace("/dashboard"); return; }
    let cancelled = false;
    fetch("/api/admin/sending")
      .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setError(body.error ?? "Couldn't load the pauses"); return; }
        setError(null);
        setData(body);
      })
      .catch(() => { if (!cancelled) setError("Couldn't reach the server"); });
    return () => { cancelled = true; };
  }, [loading, isSuperAdmin, router, tick]);

  async function resume(item: Item) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/admin/sending", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? "Couldn't resume it");
      setTick(t => t + 1);
    } finally {
      setBusy(null);
    }
  }

  if (loading || !isSuperAdmin) return <div style={{ padding: 80, color: C.st, textAlign: "center" }}>Loading…</div>;

  const open = data?.open ?? [];
  const resumed = data?.resumed ?? [];

  return (
    <div style={{ maxWidth: 980 }}>
      <button onClick={() => router.push("/admin")} style={{ background: "transparent", border: "none", color: C.st, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: "8px 0", minHeight: 44 }}>
        ← Back to Super Admin
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 22, color: C.cl, margin: "0 0 4px" }}>Sending</h2>
          <p style={{ color: C.st, fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
            {`A shop's marketing texts or emails pause on their own when, over the last 30 days, more than 2% didn't arrive, more than 0.1% of emails were marked as spam, or more than 1% of texts got a STOP reply. Every shop shares one Twilio and one Resend account, so this protects them all. Receipts and order messages still go.`}
          </p>
        </div>
        <button className="bg-btn" onClick={() => setTick(t => t + 1)}>Refresh</button>
      </div>

      {error && <p role="alert" style={{ color: C.r, fontSize: 13 }}>{error}</p>}

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Paused now</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
        {data === null && !error ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Loading…</p>
        ) : open.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>Nothing is paused. Every shop can send.</p>
        ) : open.map((p, i) => (
          <div key={p.id} style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "14px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <div style={{ color: C.cl, fontWeight: 600, fontSize: 14 }}>{p.shop}</div>
              <div style={{ color: C.y, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{`${p.label} paused`}</div>
              <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{`${p.why} Since ${when(p.pausedAt)}, by ${p.pausedBy}.`}</div>
            </div>
            <button className="bg-btn" onClick={() => resume(p)} disabled={busy === p.id} style={{ minHeight: 44 }}>
              {busy === p.id ? "Resuming…" : "Resume"}
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, color: C.cl, fontWeight: 600, margin: "0 0 10px" }}>Resumed lately</h3>
      <div className="gc" style={{ padding: 0, overflow: "hidden" }}>
        {resumed.length === 0 ? (
          <p style={{ color: C.st, fontSize: 13, padding: 20, margin: 0 }}>None yet.</p>
        ) : resumed.map((p, i) => (
          <div key={p.id} style={{ padding: "12px 18px", borderTop: i ? `1px solid ${C.mist}` : "none" }}>
            <div style={{ color: C.cl, fontSize: 13, fontWeight: 600 }}>{`${p.shop}, ${p.label.toLowerCase()}`}</div>
            <div style={{ color: C.st, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{`${p.why} Paused ${when(p.pausedAt)}, resumed ${p.resumedAt ? when(p.resumedAt) : ""}.`}</div>
          </div>
        ))}
      </div>
      <p style={{ color: C.st, fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        {`Before resuming, check the shop's list or wording with them. After a resume only new sends count, so the shop won't pause again on the old ones.`}
      </p>
    </div>
  );
}

"use client";

// ─── Win-back report ────────────────────────────────────────────────────────
// What win-back did in a month: customers messaged against customers held
// back at random, offer codes used, and where online orders came from.
// Owners and managers only. Built by GET /api/winback/report from
// lib/winback-report.ts. The same numbers are emailed to the owner on the
// 15th for the month before.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StatCard from "@/components/stat-card";
import type { WinbackReport } from "@/lib/winback-report";

const C = { g: "#00AD82", st: "#6B7C93", cl: "#F8FAFB" };
const dollars = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "—");

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const t = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

type Loaded = { report: WinbackReport; verdict: string; current: string };

function Report() {
  const router = useRouter();
  const params = useSearchParams();
  const month = params.get("month");
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/winback/report${month ? `?month=${encodeURIComponent(month)}` : ""}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) { setError(body.error ?? "Couldn't load the report."); return; }
        setError(null);
        setData(body as Loaded);
      })
      .catch(() => { if (!cancelled) setError("Couldn't load the report. Check your connection."); });
    return () => { cancelled = true; };
  }, [month]);

  const r = data?.report;
  const go = (m: string) => router.push(`/zentra-rewards/report?month=${m}`);
  const btn: React.CSSProperties = { minHeight: 44, minWidth: 44 };

  return (
    <div>
      <div className="zb-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 19, color: "#fff" }}>{r ? `Win-back report, ${r.label}` : "Win-back report"}</h2>
          <p style={{ color: C.st, fontSize: 12, lineHeight: 1.5 }}>What your win-back messages brought in, compared with customers held back.</p>
        </div>
        {r && data && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="bg-btn" style={btn} aria-label="Month before" onClick={() => go(shift(r.month, -1))}>←</button>
            <button className="bg-btn" style={btn} aria-label="Month after" disabled={r.month >= data.current} onClick={() => go(shift(r.month, 1))}>→</button>
            <a href="/zentra-rewards" className="bg-btn" style={{ ...btn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Win-Back rules</a>
          </div>
        )}
      </div>

      {error && <div className="gc" style={{ padding: 16, color: "#FFC14B", fontSize: 13 }}>{error}</div>}
      {!r && !error && <div className="gc" style={{ padding: 16, color: C.st, fontSize: 13 }}>Loading…</div>}

      {r && data && (
        <>
          <div className="gc" style={{ padding: 18, marginBottom: 14, fontSize: 15, lineHeight: 1.6, color: C.cl }}>{data.verdict}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <StatCard label="Customers messaged" value={String(r.sent)} icon="send" />
            <StatCard label="Came back" value={`${r.sentBack}`} subtitle={`${pct(r.sentBack, r.sent)} within 14 days`} accent icon="return" delay={50} />
            <StatCard label="They spent" value={dollars(r.sentRevenue)} accent icon="money" delay={100} />
            <StatCard label="Held back" value={String(r.held)} subtitle={`${r.heldBackCount} came back anyway (${pct(r.heldBackCount, r.held)})`} icon="chart" delay={150} />
          </div>

          <div className="zb-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div className="gc" style={{ padding: 18 }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 8 }}>Offer codes</div>
              <p style={{ fontSize: 13, color: C.cl, lineHeight: 1.6, margin: 0 }}>
                {r.codesUsed
                  ? `${r.codesUsed} ${r.codesUsed === 1 ? "code was" : "codes were"} used this month, on orders worth ${dollars(r.codeRevenue)}.`
                  : "No offer codes were used this month."}
              </p>
            </div>
            <div className="gc" style={{ padding: 18 }}>
              <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 8 }}>Where online orders came from</div>
              {r.sources.length === 0 ? (
                <p style={{ fontSize: 13, color: C.st, lineHeight: 1.6, margin: 0 }}>No online orders this month yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.sources.map(s => (
                    <div key={s.cameFrom} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, color: C.cl }}>
                      <span>{s.label}</span>
                      <span style={{ color: C.st, whiteSpace: "nowrap" }}>{`${s.orders} ${s.orders === 1 ? "order" : "orders"}, ${dollars(s.revenue)}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p style={{ fontSize: 12, color: C.st, lineHeight: 1.6, maxWidth: 720 }}>
            About 1 in 10 customers due a win-back message is held back at random and sent nothing, so this page can show what the messages add over people who would have come back anyway.
            {" "}Came back means any order, online or at the counter, within 14 days. Each customer counts once a month.
            {r.stillCounting > 0 ? ` ${r.stillCounting} ${r.stillCounting === 1 ? "customer is" : "customers are"} still inside their 14 days, so these numbers can still go up.` : ""}
          </p>
        </>
      )}
    </div>
  );
}

export default function WinbackReportPage() {
  return <Suspense fallback={null}><Report /></Suspense>;
}

// ============================================================
// app/analytics/page.tsx
// ANALYTICS PAGE — Performance metrics and channel migration
// ============================================================

import PageHeader from "@/components/page-header";
import StatCard from "@/components/stat-card";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="Performance metrics & channel migration" />

      {/* ── STAT CARDS ── */}
      <div className="mb-6 flex gap-3">
        <StatCard label="Total Revenue" value="$189,420" accent icon="💰" />
        <StatCard label="Avg Order Value" value="$44.90" icon="📊" />
        <StatCard label="Repeat Rate" value="64%" accent icon="🔄" />
        <StatCard label="New Customers" value="89" subtitle="This month" icon="👥" />
        <StatCard label="Churn Risk" value="38%" icon="⚠️" />
      </div>

      {/* ── CHANNEL SPLIT + SEGMENTS ── */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Channel split */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-heading text-sm font-semibold text-white">Channel Split</h3>
          <div className="mb-3 flex gap-1">
            <div className="flex h-11 items-center justify-center rounded-l-xl bg-gradient-to-r from-[#00B67A] to-[#00B67A]/70 font-heading text-[15px] font-bold text-white" style={{ flex: 72 }}>72%</div>
            <div className="flex h-11 items-center justify-center rounded-r-xl bg-gradient-to-r from-[#FF6B35]/70 to-[#FF6B35] font-heading text-[15px] font-bold text-white" style={{ flex: 28 }}>28%</div>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>🟢 Direct</span><span>🟠 Aggregator</span>
          </div>
        </div>

        {/* Customer segments */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-heading text-sm font-semibold text-white">Customer Segments</h3>
          {[
            { label: "VIP", count: 184, color: "#00B67A", pct: 40 },
            { label: "At Risk", count: 127, color: "#FF6B35", pct: 28 },
            { label: "New", count: 89, color: "#3B82F6", pct: 19 },
          ].map((seg) => (
            <div key={seg.label} className="mb-3">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-white">{seg.label}</span>
                <span className="font-semibold" style={{ color: seg.color }}>{seg.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, background: `linear-gradient(90deg, ${seg.color}, ${seg.color}88)` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TOP CUSTOMERS ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
        <h3 className="mb-4 font-heading text-sm font-semibold text-white">Top Customers by Revenue</h3>
        {[
          { rank: 1, name: "Liam Smith", segment: "VIP", spent: "$1,892" },
          { rank: 2, name: "Olivia Brown", segment: "VIP", spent: "$1,540" },
          { rank: 3, name: "Emma Jones", segment: "Regular", spent: "$1,234" },
          { rank: 4, name: "Noah Williams", segment: "New", spent: "$987" },
          { rank: 5, name: "James Wilson", segment: "VIP", spent: "$876" },
        ].map((c) => (
          <div key={c.rank} className="flex items-center gap-3 border-b border-white/[0.04] py-2.5 last:border-0">
            <span className="w-5 font-heading text-xs font-bold text-slate-500">#{c.rank}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1C2D48] to-[#0F1F2D] text-[10px] font-semibold text-slate-400">
              {c.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <span className="flex-1 text-[13px] font-medium text-white">{c.name}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              c.segment === "VIP" ? "bg-[#00B67A]/15 text-[#00B67A]" :
              c.segment === "New" ? "bg-blue-500/12 text-blue-400" :
              "bg-white/[0.06] text-slate-400"
            }`}>{c.segment}</span>
            <span className="font-heading text-[13px] font-bold text-[#00B67A]">{c.spent}</span>
          </div>
        ))}
      </div>
    </>
  );
}

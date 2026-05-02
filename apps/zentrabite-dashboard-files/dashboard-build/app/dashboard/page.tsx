// ============================================================
// app/dashboard/page.tsx
// DASHBOARD PAGE — the main landing page merchants see daily
// Shows stat cards, revenue chart placeholder, win-back panel, recent orders
// ============================================================

import PageHeader from "@/components/page-header";
import StatCard from "@/components/stat-card";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Today's snapshot"
        action={{ label: "Export Report" }}
      />

      {/* ── STAT CARDS ── */}
      <div className="mb-6 flex gap-3">
        <StatCard label="Today's Orders" value="23" icon="📋" />
        <StatCard label="Today's Revenue" value="$1,052" icon="💰" accent />
        <StatCard label="Avg Order Value" value="$44.90" icon="📊" />
        <StatCard
          label="SMS Credits"
          value="847"
          subtitle="153 used"
          icon="💬"
        />
      </div>

      {/* ── CHART + WIN-BACK ROW ── */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {/* Revenue chart placeholder */}
        <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-heading text-sm font-semibold text-white">
            7-Day Revenue
          </h3>
          <div className="flex h-32 items-end gap-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day, i) => {
                const h1 = 40 + Math.random() * 60;
                const h2 = 15 + Math.random() * 30;
                return (
                  <div
                    key={day}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex w-full flex-col gap-0.5">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-[#00B67A]/40 to-[#00B67A]"
                        style={{ height: h1 }}
                      />
                      <div
                        className="w-full rounded-b bg-gradient-to-t from-[#FF6B35]/40 to-[#FF6B35]"
                        style={{ height: h2 }}
                      />
                    </div>
                    <span className="mt-1 text-[10px] text-slate-500">
                      {day}
                    </span>
                  </div>
                );
              }
            )}
          </div>
          <div className="mt-4 flex gap-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="h-2.5 w-2.5 rounded-sm bg-[#00B67A]" /> Direct
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="h-2.5 w-2.5 rounded-sm bg-[#FF6B35]" />{" "}
              Aggregator
            </div>
          </div>
        </div>

        {/* Zentra Rewards panel */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
          <h3 className="mb-4 font-heading text-sm font-semibold text-white">
            Zentra Rewards
          </h3>
          <p className="font-heading text-3xl font-bold text-[#00B67A]">
            $8,460
          </p>
          <p className="mb-5 text-[11px] text-slate-500">
            Recovered this month
          </p>
          {[
            ["Sent", "312"],
            ["Converted", "94"],
            ["Conv. Rate", "30%"],
          ].map(([label, val]) => (
            <div
              key={label}
              className="flex justify-between border-b border-white/[0.04] py-2.5 text-[13px]"
            >
              <span className="text-slate-400">{label}</span>
              <span className="font-semibold text-white">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECENT ORDERS TABLE ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
        <h3 className="mb-4 font-heading text-sm font-semibold text-white">
          Recent Orders
        </h3>
        {[
          { name: "Liam S.", items: "Margherita + Garlic Bread", total: "$31", channel: "Direct", status: "Delivered" },
          { name: "Emma J.", items: "Pepperoni", total: "$24", channel: "Uber Eats", status: "Preparing" },
          { name: "Noah W.", items: "Latte x2 + Caesar Salad", total: "$28", channel: "Direct", status: "New" },
          { name: "Olivia B.", items: "Butter Chicken", total: "$22", channel: "Direct", status: "Ready" },
          { name: "James T.", items: "Fish & Chips + Flat White", total: "$27", channel: "Uber Eats", status: "Delivered" },
        ].map((order, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-white/[0.04] py-3 last:border-0"
          >
            <div>
              <span className="text-[13px] font-semibold text-white">
                {order.name}
              </span>
              <span className="ml-3 text-xs text-slate-400">
                {order.items}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                  order.channel === "Direct"
                    ? "bg-[#00B67A]/10 text-[#00B67A]"
                    : "bg-[#FF6B35]/10 text-[#FF6B35]"
                }`}
              >
                {order.channel}
              </span>
              <span className="min-w-[48px] text-right text-[13px] font-semibold text-white">
                {order.total}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================
// app/customers/page.tsx
// CUSTOMERS PAGE — CRM customer list
// ============================================================

import PageHeader from "@/components/page-header";
import { Users } from "lucide-react";
import EmptyState from "@/components/empty-state";

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="1,842 total"
        action={{ label: "+ Add Customer" }}
      />

      {/* ── SEARCH + FILTER BAR ── */}
      <div className="mb-5 flex gap-3">
        <input
          type="text"
          placeholder="Search name or phone..."
          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] text-slate-300 placeholder-slate-600 outline-none transition-colors focus:border-[#00B67A]/40"
        />
        {["All", "VIP", "At Risk", "New"].map((filter) => (
          <button
            key={filter}
            className={`rounded-lg border px-4 py-2.5 font-heading text-xs font-medium transition-all ${
              filter === "All"
                ? "border-[#00B67A]/25 bg-[#00B67A]/10 text-[#00B67A]"
                : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ── TABLE PLACEHOLDER ── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 backdrop-blur-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Customer", "Phone", "Orders", "Spent", "Last Order", "Channel", "Segment"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-heading text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Liam Smith", phone: "0412 345 678", orders: 18, spent: "$892", last: "2 days ago", channel: "Direct", segment: "VIP" },
              { name: "Emma Jones", phone: "0423 456 789", orders: 6, spent: "$234", last: "18 days ago", channel: "Uber Eats", segment: "At Risk" },
              { name: "Noah Williams", phone: "0434 567 890", orders: 3, spent: "$127", last: "5 days ago", channel: "Direct", segment: "New" },
              { name: "Olivia Brown", phone: "0445 678 901", orders: 12, spent: "$540", last: "1 day ago", channel: "Direct", segment: "VIP" },
              { name: "James Wilson", phone: "0456 789 012", orders: 8, spent: "$360", last: "12 days ago", channel: "Uber Eats", segment: "Regular" },
            ].map((c, i) => (
              <tr
                key={i}
                className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1C2D48] to-[#0F1F2D] text-[11px] font-semibold text-slate-400">
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-[13px] font-semibold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.phone}</td>
                <td className="px-4 py-3 text-[13px] font-semibold text-white">{c.orders}</td>
                <td className="px-4 py-3 text-[13px] font-semibold text-white">{c.spent}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{c.last}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                    c.channel === "Direct"
                      ? "bg-[#00B67A]/10 text-[#00B67A]"
                      : "bg-[#FF6B35]/10 text-[#FF6B35]"
                  }`}>{c.channel}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                    c.segment === "VIP" ? "bg-[#00B67A]/15 text-[#00B67A]" :
                    c.segment === "At Risk" ? "bg-[#FF6B35]/12 text-[#FF6B35]" :
                    c.segment === "New" ? "bg-blue-500/12 text-blue-400" :
                    "bg-white/[0.06] text-slate-400"
                  }`}>{c.segment}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

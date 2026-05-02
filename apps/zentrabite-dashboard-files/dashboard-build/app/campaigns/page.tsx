// ============================================================
// app/campaigns/page.tsx
// CAMPAIGNS PAGE — SMS campaign cards with revenue attribution
// ============================================================

import PageHeader from "@/components/page-header";

const CAMPAIGNS = [
  { name: "Zentra Rewards", trigger: "14 days inactive", sent: 312, converted: 94, rate: "30%", revenue: "$8,460", status: "active" },
  { name: "Birthday Offer", trigger: "3 days before birthday", sent: 47, converted: 32, rate: "68%", revenue: "$2,880", status: "active" },
  { name: "Re-engage Uber", trigger: "Uber Eats order detected", sent: 156, converted: 64, rate: "41%", revenue: "$5,120", status: "active" },
  { name: "Order Confirm", trigger: "Order placed", sent: 1842, converted: null, rate: "—", revenue: "—", status: "active" },
  { name: "Review Request", trigger: "2hrs after delivery", sent: 967, converted: null, rate: "—", revenue: "—", status: "paused" },
];

export default function CampaignsPage() {
  return (
    <>
      <PageHeader title="SMS Campaigns" subtitle="Automated with revenue attribution" action={{ label: "+ New Campaign" }} />

      <div className="flex flex-col gap-3">
        {CAMPAIGNS.map((c, i) => (
          <div key={i} className="cursor-pointer rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-5 backdrop-blur-xl transition-all hover:border-[#00B67A]/20">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-[15px] font-bold text-white">{c.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    c.status === "active" ? "bg-[#00B67A]/10 text-[#00B67A]" : "bg-white/[0.06] text-slate-500"
                  }`}>{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{c.trigger}</p>
              </div>
              <div className="flex gap-8">
                {[["Sent", c.sent], ["Converted", c.converted ?? "—"], ["Rate", c.rate], ["Revenue", c.revenue]].map(([label, val]) => (
                  <div key={String(label)} className="text-center">
                    <p className={`font-heading text-lg font-bold ${label === "Revenue" || label === "Rate" ? "text-[#00B67A]" : "text-white"}`}>{String(val)}</p>
                    <p className="text-[10px] text-slate-500">{String(label)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

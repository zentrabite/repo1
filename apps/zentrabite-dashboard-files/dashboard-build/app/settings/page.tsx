// ============================================================
// app/settings/page.tsx
// SETTINGS PAGE — Business profile, Win-Back config, and Team
// ============================================================

import PageHeader from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Business profile & configuration" />

      <div className="grid grid-cols-2 gap-4">
        {/* ── BUSINESS PROFILE ── */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
          <h3 className="mb-5 font-heading text-[15px] font-semibold text-white">Business Profile</h3>
          {[
            ["Business Name", "Sorrento's Pizza"],
            ["Type", "Restaurant"],
            ["Location", "Norwood, SA"],
            ["Subdomain", "sorrentos.zentrabite.com.au"],
            ["Plan", "Pro"],
            ["Joined", "2025-11-12"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-white/[0.05] py-3 text-[13px]">
              <span className="text-slate-400">{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{value}</span>
                <button className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {/* ── ZENTRA REWARDS CONFIG ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
            <h3 className="mb-5 font-heading text-[15px] font-semibold text-white">Zentra Rewards Config</h3>
            {[
              ["Engine Status", "✅ Active"],
              ["Inactivity Trigger", "14 days"],
              ["Discount Amount", "$10"],
              ["Cooldown Period", "30 days"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-white/[0.05] py-3 text-[13px]">
                <span className="text-slate-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{value}</span>
                  <button className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── TEAM ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-heading text-[15px] font-semibold text-white">Team</h3>
              <button className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white">
                + Invite
              </button>
            </div>
            {[
              { email: "admin@sorrentos.com.au", role: "Owner", color: "bg-[#00B67A]/10 text-[#00B67A]" },
              { email: "sarah@email.com", role: "Manager", color: "bg-blue-500/12 text-blue-400" },
              { email: "jake@email.com", role: "Staff", color: "bg-white/[0.06] text-slate-400" },
            ].map((member) => (
              <div key={member.email} className="flex items-center justify-between border-b border-white/[0.05] py-3 text-[13px]">
                <span className="text-white">{member.email}</span>
                <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${member.color}`}>{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

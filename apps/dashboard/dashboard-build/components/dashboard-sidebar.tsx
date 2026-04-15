// ============================================================
// components/dashboard-sidebar.tsx
// Left sidebar — branding + navigation + active state highlighting
// "use client" because it reads the current URL for active state
// ============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";

export default function DashboardSidebar() {
  // usePathname() gives us the current URL path so we can highlight the active nav item
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-[220px] flex-col border-r border-white/[0.06] bg-[#0a1222]/80 backdrop-blur-xl">
      {/* ── BRANDING ── */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
        {/* Green gradient logo mark */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00B67A] to-[#00A06B] text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20">
          ZB
        </div>
        <div>
          <span className="font-heading text-[15px] font-extrabold tracking-tight text-white">
            Zentra<span className="text-[#00B67A]">Bite</span>
          </span>
          <p className="text-[10px] font-medium text-slate-500">Merchant CRM</p>
        </div>
      </div>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          // Check if this nav item matches the current page
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5
                text-[13px] font-medium transition-all duration-200
                ${
                  isActive
                    ? "border-l-2 border-[#00B67A] bg-[#00B67A]/10 font-semibold text-[#00B67A]"
                    : "border-l-2 border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }
              `}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? "text-[#00B67A]" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── BOTTOM SECTION — business info ── */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-base">
            🍕
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">Sorrento&apos;s Pizza</p>
            <p className="text-[10px] text-slate-500">Norwood, SA</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

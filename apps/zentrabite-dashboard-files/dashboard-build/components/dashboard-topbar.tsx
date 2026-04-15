// ============================================================
// components/dashboard-topbar.tsx
// Top bar — dynamic page title + search + user avatar
// "use client" because it reads the current URL for the page title
// ============================================================

"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import { Search, Bell } from "lucide-react";

export default function DashboardTopbar() {
  const pathname = usePathname();

  // Find the current page from navigation config to get its title
  const currentPage = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between border-b border-white/[0.06] bg-[#0b1424]/80 px-7 backdrop-blur-xl">
      {/* ── LEFT: Page title + live indicator ── */}
      <div>
        <h1 className="font-heading text-lg font-bold text-white">
          {currentPage?.label ?? "Dashboard"}
        </h1>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          {currentPage?.description ?? "Overview"}
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#00B67A]" />
        </p>
      </div>

      {/* ── RIGHT: Search + notifications + user ── */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none"
          />
        </div>

        {/* Notification bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] transition-colors hover:bg-white/[0.08]">
          <Bell size={15} className="text-slate-400" />
          {/* Green dot for unread notifications */}
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#00B67A]" />
        </button>

        {/* User avatar */}
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-[#00B67A] to-[#00A06B] text-xs font-bold text-white shadow-md shadow-[#00B67A]/20 transition-transform hover:scale-105">
          ZB
        </div>
      </div>
    </header>
  );
}

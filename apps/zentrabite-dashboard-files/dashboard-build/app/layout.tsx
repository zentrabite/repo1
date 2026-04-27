// ============================================================
// app/layout.tsx
// ROOT LAYOUT — wraps every page in the app
// Sets up: fonts, global styles, sidebar, topbar, content area
// This file runs on the SERVER (no "use client" needed)
// ============================================================

import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardTopbar from "@/components/dashboard-topbar";

// ── FONT SETUP ──
// Next.js automatically optimises these Google Fonts
// They become CSS variables we use in Tailwind config

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ── PAGE METADATA ──
export const metadata: Metadata = {
  title: "ZentraBite — Merchant CRM",
  description: "Own your customers. Own your margins.",
};

// ── LAYOUT COMPONENT ──
// Every page in the app renders inside this layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#080E18] font-body text-slate-300 antialiased">
        {/* Background glow effects (matches demo) */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] bg-[radial-gradient(circle,rgba(0,182,122,0.06)_0%,transparent_70%)]" />
          <div className="absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] bg-[radial-gradient(circle,rgba(255,107,53,0.04)_0%,transparent_70%)]" />
        </div>

        {/* ── SIDEBAR (fixed left) ── */}
        <DashboardSidebar />

        {/* ── MAIN AREA (offset by sidebar width) ── */}
        <div className="ml-[220px] min-h-screen">
          {/* ── TOP BAR (sticky top) ── */}
          <DashboardTopbar />

          {/* ── PAGE CONTENT (scrollable) ── */}
          <main className="relative z-10 p-7">
            <div className="animate-page-in">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import DashboardShell from "@/components/dashboard-shell";

// The fonts live in app/fonts, so the build never downloads anything. Random
// Vercel build failures were most likely a failed Google Fonts download.
const outfit = localFont({ src: "./fonts/outfit-latin-wght-normal.woff2", weight: "100 900", variable: "--font-outfit", display: "swap" });
const inter  = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", variable: "--font-inter", display: "swap" });
const mono   = localFont({ src: "./fonts/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ZentraBite — Merchant CRM",
  description: "Own your customers. Own your margins.",
};

// Browser bar on phones matches the dark CRM and ordering page. Restaurant
// websites set their own in app/site/[subdomain].
export const viewport: Viewport = {
  themeColor: "#0F1F2D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable}`}>
      <body style={{ background: "#0F1F2D", color: "#F8FAFB", minHeight: "100vh" }}>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}

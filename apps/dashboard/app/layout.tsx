import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DashboardShell from "@/components/dashboard-shell";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter  = Inter({  subsets: ["latin"], variable: "--font-inter",  display: "swap" });
const mono   = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ZentraBite — Merchant CRM",
  description: "Own your customers. Own your margins.",
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

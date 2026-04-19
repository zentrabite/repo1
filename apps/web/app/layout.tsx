import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ZentraBite — Own your customers. Own your margins.",
  description:
    "The all-in-one CRM, ordering, and delivery platform for restaurants. Commission-free storefronts, live order management, built-in loyalty, and smart delivery routing.",
  openGraph: {
    title: "ZentraBite — Own your customers. Own your margins.",
    description:
      "The all-in-one CRM, ordering, and delivery platform for restaurants.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

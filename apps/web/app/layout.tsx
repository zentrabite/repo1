import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const SITE_URL = "https://zentrabite.com";
const DESCRIPTION =
  "Your own website, online ordering, customer list, rewards and win-back texts in one system. Built in Adelaide for restaurants, cafés, shops, salons, gyms and trades.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ZentraBite | Website, ordering and CRM for small businesses",
    template: "%s | ZentraBite",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "ZentraBite | Website, ordering and CRM for small businesses",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "ZentraBite",
    locale: "en_AU",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Structured data so search engines know who we are.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "ZentraBite",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/zentrabite-icon.svg`,
      address: { "@type": "PostalAddress", addressLocality: "Adelaide", addressRegion: "SA", addressCountry: "AU" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "ZentraBite",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}

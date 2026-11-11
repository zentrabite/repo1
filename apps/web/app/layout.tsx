import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans is the marketing site's font (picked 11 Nov). Outfit stays
// for the logo and the demos, which show the app in its own font.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
// Only the demos use the mono face, so it isn't preloaded on every page.
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });

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
  // No canonical here. Pages set their own, otherwise every page without one
  // (the demos) would point search engines at the home page.
  openGraph: {
    title: "ZentraBite | Website, ordering and CRM for small businesses",
    description: DESCRIPTION,
    siteName: "ZentraBite",
    locale: "en_AU",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// viewport-fit=cover lets the page run edge to edge on phones with a notch.
// globals.css pads the nav, page sides and footer back out with
// env(safe-area-inset-*). The demos switch it off in their layouts.
// The site is light only (12 Nov), so the phone's browser bar is white.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ffffff",
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
    <html lang="en-AU" className={`${jakarta.variable} ${outfit.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}

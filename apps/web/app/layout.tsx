import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
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
// The browser bar colour follows the device here. theme-toggle.tsx updates it
// when someone picks light or dark.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFB" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1F2D" },
  ],
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

// Sets the saved light or dark choice before the page draws, so there's no
// flash of the wrong theme. With no saved choice the CSS follows the device.
const THEME_SCRIPT = `try{var t=localStorage.getItem("zb-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${outfit.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}

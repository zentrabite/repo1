import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ZentraBite — The business operating system for modern merchants",
  description:
    "Orders, loyalty, marketing, AI phone ordering, drivers, stock and reviews — one platform. One month free. Tailored to your business.",
  metadataBase: new URL("https://zentrabite.com.au"),
  openGraph: {
    title: "ZentraBite — The business operating system",
    description:
      "One platform for orders, loyalty, campaigns, AI phone ordering, dispatch and stock. Tailored to your business.",
    url: "https://zentrabite.com.au",
    siteName: "ZentraBite",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZentraBite — The business operating system",
    description:
      "Orders · loyalty · campaigns · AI calls · drivers · stock · reviews. Tailored to your business.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

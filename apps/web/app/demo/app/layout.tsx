import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Customer app demo",
  description: "An early look at a customer app for ordering and rewards, with made-up data.",
  alternates: { canonical: "/demo/app" },
};

// The demos were built for the browser's normal safe area, so they keep it
// (the marketing pages use viewport-fit=cover, see app/layout.tsx).
// The demos stay dark, so the phone's browser bar does too.
export const viewport: Viewport = { viewportFit: "auto", themeColor: "#0f1f2d" };

// The demos always stay dark, whatever theme the visitor picked.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-dark">{children}</div>;
}

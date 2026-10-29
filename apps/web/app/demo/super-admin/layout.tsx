import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Admin demo",
  description: "How the ZentraBite platform is run behind the scenes, with made-up data.",
  alternates: { canonical: "/demo/super-admin" },
};

// The demos were built for the browser's normal safe area, so they keep it
// (the marketing pages use viewport-fit=cover, see app/layout.tsx).
export const viewport: Viewport = { viewportFit: "auto" };

// The demos always stay dark, whatever theme the visitor picked.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-dark">{children}</div>;
}

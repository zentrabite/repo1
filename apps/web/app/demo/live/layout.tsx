import type { Metadata, Viewport } from "next";
import { DemoShell } from "./demo-shell";

export const metadata: Metadata = {
  title: "CRM demo",
  description: "Click through the ZentraBite CRM with made-up data. Orders, customers, rewards, win-back texts and reports.",
};

// The demos were built for the browser's normal safe area, so they keep it
// (the marketing pages use viewport-fit=cover, see app/layout.tsx).
// The demos stay dark, so the phone's browser bar does too.
export const viewport: Viewport = { viewportFit: "auto", themeColor: "#0f1f2d" };

export default function DemoLiveLayout({ children }: { children: React.ReactNode }) {
  // The demos always stay dark, whatever theme the visitor picked.
  return (
    <div className="force-dark">
      <DemoShell>{children}</DemoShell>
    </div>
  );
}

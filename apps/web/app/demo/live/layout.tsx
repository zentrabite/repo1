import type { Metadata } from "next";
import { DemoShell } from "./demo-shell";

export const metadata: Metadata = {
  title: "CRM demo",
  description: "Click through the ZentraBite CRM with made-up data. Orders, customers, rewards, win-back texts and reports.",
};

export default function DemoLiveLayout({ children }: { children: React.ReactNode }) {
  // The demos always stay dark, whatever theme the visitor picked.
  return (
    <div className="force-dark">
      <DemoShell>{children}</DemoShell>
    </div>
  );
}

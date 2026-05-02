import type { Metadata } from "next";
import { DemoShell } from "./demo-shell";

export const metadata: Metadata = {
  title: "Live demo — ZentraBite",
  description: "Click through a fully-populated ZentraBite dashboard with fake data. See orders, customers, Zentra Rewards campaigns, and financials.",
};

export default function DemoLiveLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}

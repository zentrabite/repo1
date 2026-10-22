import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ordering page demo",
  description: "What customers see when they order from a business on ZentraBite, with made-up data.",
};

// The demos always stay dark, whatever theme the visitor picked.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-dark">{children}</div>;
}

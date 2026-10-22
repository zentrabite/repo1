import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin demo",
  description: "How the ZentraBite platform is run behind the scenes, with made-up data.",
};

// The demos always stay dark, whatever theme the visitor picked.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-dark">{children}</div>;
}

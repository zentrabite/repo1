import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer app demo",
  description: "An early look at a customer app for ordering and rewards, with made-up data.",
};

// The demos always stay dark, whatever theme the visitor picked.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="force-dark">{children}</div>;
}

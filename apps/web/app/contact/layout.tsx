import type { Metadata } from "next";

// The contact page is a client component, so its title and description live here.
export const metadata: Metadata = {
  title: "Book a call",
  description:
    "Tell us about your business and we'll show you how ZentraBite would work for you. A short call with the team in Adelaide.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

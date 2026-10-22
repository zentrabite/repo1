import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { Icon, type IconName } from "../components/zb-icon";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Click through ZentraBite with made-up data. Try the business owner's CRM, the customer ordering page and the admin view. No sign-up needed.",
  alternates: { canonical: "/demo" },
};

type Demo = { href: string; icon: IconName; title: string; body: string; cta: string; main?: boolean };

const DEMOS: Demo[] = [
  {
    href: "/demo/live",
    icon: "dashboard",
    title: "The CRM",
    body: "What you'd use to run the business, set up for a made-up pizzeria called Nonna's Kitchen. Orders, customers, rewards, win-back, stock, delivery and reports.",
    cta: "Open the CRM",
    main: true,
  },
  {
    href: "/demo/merchant",
    icon: "storefront",
    title: "The ordering page",
    body: "What your customers see when they order from you. Menu, cart, checkout, order tracking and their rewards.",
    cta: "Open the ordering page",
  },
  {
    href: "/demo/app",
    icon: "smartphone",
    title: "The customer app",
    body: "An early look at the app your customers could add to their phone, with ordering and rewards in one place.",
    cta: "Open the app",
  },
  {
    href: "/demo/super-admin",
    icon: "settings",
    title: "The admin view",
    body: "How we run the platform behind the scenes. Turning parts on for each business, billing and platform health.",
    cta: "Open the admin view",
  },
];

export default function DemoPage() {
  return (
    <>
      <Nav />
      <main className="page-top" style={{ paddingBottom: 96 }}>
        <div className="container">
          <div className="section-head">
            <span className="label">Demo</span>
            <h1 className="h-page">Click around with made-up data.</h1>
            <p className="lead">
              No sign-up and nothing is saved. Each demo opens in this tab, and the back button brings you here.
            </p>
          </div>

          <div className="demo-grid">
            {DEMOS.map((d) => (
              <Link key={d.href} href={d.href} className={`link-card${d.main ? " main" : ""}`}>
                <Icon name={d.icon} size={28} />
                <h2 className="h-card">{d.title}</h2>
                <p>{d.body}</p>
                <span className="more">{d.cta} →</span>
              </Link>
            ))}
          </div>

          <p className="muted" style={{ marginTop: 40 }}>
            Want someone to walk you through it?{" "}
            <Link href="/contact" className="text-link">
              Book a 15-minute call
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

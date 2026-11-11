import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { Closing } from "../components/home/closing";
import { BusinessTypeProvider } from "../components/home/business-type";
import { FeatureDirectory } from "./feature-directory";
import { FeatureScreen } from "./feature-screen";
import { VISUALS } from "./media";

// Every part of ZentraBite (12 Nov, in the homepage's style): a plain
// headline and Book a call beside the customer list every part shares, then
// "How do your customers buy?" and the parts by group, each with its screen.

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything in ZentraBite, from your website and online ordering to rewards, win-back texts, POS, stock and reports. Switch on only what your business uses.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  const crm = VISUALS.crm;
  return (
    <>
      <Nav />
      <main>
        <section className="fp-top fd-top" aria-labelledby="features-title">
          <div className="wrap fd-top-grid">
            <div>
              <h1 id="features-title" className="fp-h1 fd-h1">
                Every part of ZentraBite.
              </h1>
              <p className="fp-lead">
                They all share one customer list, and you only switch on what your business uses.
              </p>
              <div className="hm-actions fp-actions">
                <Link href="/contact" className="btn-primary btn-lg">
                  Book a call
                </Link>
                <Link href="/demo/live" className="hm-link">
                  Try the live demo
                </Link>
              </div>
            </div>
            {crm && (
              <div className="fp-enter">
                <FeatureScreen visual={crm} priority caption="The customer list every part shares. Our demo restaurant, sample data." />
              </div>
            )}
          </div>
        </section>
        <BusinessTypeProvider>
          <FeatureDirectory />
        </BusinessTypeProvider>
        <Closing />
      </main>
      <Footer />
    </>
  );
}

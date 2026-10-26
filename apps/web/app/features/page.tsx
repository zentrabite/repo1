import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { CTABanner } from "../components/cta-banner";
import { Icon } from "../components/zb-icon";
import { FEATURE_GROUPS } from "./groups";
import { getFeature } from "./data";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything in ZentraBite, from your website and online ordering to rewards, win-back texts, POS, stock and reports. Switch on only what your business uses.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="page-top">
          <div className="container">
            <div className="section-head">
              <span className="label">Features</span>
              <h1 className="h-page">Everything inside ZentraBite.</h1>
              <p className="lead">
                Every part shares the same customer list, and you only switch on what your business uses. Pick one to
                see how it works.
              </p>
            </div>

            {FEATURE_GROUPS.map((g) => (
              <div key={g.id} className="fx-group">
                <div className="fx-group-head">
                  <span className="ex-ico" aria-hidden>
                    <Icon name={g.icon} size={22} />
                  </span>
                  <h2 className="h-card" style={{ fontSize: 24 }}>
                    {g.title}
                  </h2>
                </div>
                <p className="muted">{g.note}</p>
                <div className="fx-grid">
                  {g.items.map((item) => {
                    const f = getFeature(item.slug);
                    if (!f) return null;
                    return (
                      <Link key={item.slug} href={`/features/${item.slug}`} className="link-card">
                        <Icon name={f.icon} size={26} />
                        <h3 className="h-card">{item.name}</h3>
                        <p>{f.tagline}</p>
                        <span className="more">Read more →</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}

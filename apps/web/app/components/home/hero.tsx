import Link from "next/link";
import { HeroScreens } from "./hero-screens";

// 1. Hero. Navy in light and dark mode. The headline, one sentence, the one
// action and three real screens in story order: their phone, then your CRM
// twice. Approved as option B on 10 Nov.
export function Hero() {
  return (
    <section className="hm-hero on-navy" data-nav-tone="navy" aria-labelledby="hero-title">
      <div className="wrap hm-hero-grid">
        <div className="hm-hero-text">
          <h1 id="hero-title" className="hm-h1">
            <span>Know your regulars.</span> <span>Notice when they stop coming.</span>
          </h1>
          <p className="hm-hero-lead">
            They order on your own site with no commission. Then they join your list, earn rewards and get a text if
            they go quiet.
          </p>
          <div className="hm-actions">
            <Link href="/contact" className="btn-primary btn-lg">
              Book a call
            </Link>
            <Link href="/demo/live" className="hm-link">
              Try the live demo
            </Link>
          </div>
        </div>
        <HeroScreens />
      </div>
    </section>
  );
}

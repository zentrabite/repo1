"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useBusinessType, type BusinessType } from "./business-type";

// 6. Set up from the site you have. Replaces "See it with your name on it"
// (11 Nov). It answers the worry that setting up is work: we fill in the new
// site from the one they already have, using the website import, and they
// check it before it goes live. The visitor can type their current web
// address. "Book a call" carries it to the contact form (/contact?site=...),
// which puts it in their notes so we have it before the call.

// What the import fills in, by how customers buy
const FILLS: Record<BusinessType, string[]> = {
  order: ["Your name and logo", "Your menu or products, with prices", "Your opening hours", "Your photos and colours"],
  book: ["Your name and logo", "Your services and prices", "Your opening hours", "Your photos and colours"],
  quote: ["Your name and logo", "Your services and prices", "Your hours and contact details", "Your photos and colours"],
};

const STARTER: Record<BusinessType, string> = {
  order: "No website yet? We can start from your menu or product list.",
  book: "No website yet? We can start from your price list.",
  quote: "No website yet? We can start from your list of services.",
};

// Same idea as the contact form's limits: long enough for any real address.
const MAX = 200;

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function SetUp() {
  const { type } = useBusinessType();
  const [site, setSite] = useState("");
  const id = useId();
  const clean = site.replace(/\s+/g, "").slice(0, MAX);
  const href = clean ? `/contact?site=${encodeURIComponent(clean)}` : "/contact";

  return (
    <section className="hm-setup" aria-labelledby="setup-title">
      <div className="wrap hm-setup-grid">
        <div className="hm-setup-text">
          <h2 id="setup-title" className="hm-h2">
            Set up from the site you have.
          </h2>
          <p className="hm-lead">
            Send us your current website. We use it to fill in your new one, and you check it all before it goes live.
          </p>
          <ul className="hm-setup-list">
            {FILLS[type].map((f) => (
              <li key={`${type}-${f}`}>
                <Tick />
                <span className="hm-swap">{f}</span>
              </li>
            ))}
          </ul>
          <div className="hm-setup-form">
            <label htmlFor={id} className="hm-setup-label">
              Your current website
            </label>
            <input
              id={id}
              className="input hm-setup-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              maxLength={MAX}
              placeholder="For example, yourbusiness.com.au"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              enterKeyHint="done"
              spellCheck={false}
            />
            <div className="hm-setup-actions">
              <Link href={href} className="btn-primary btn-lg">
                Book a call
              </Link>
              <p className="hm-setup-note">{clean ? "We'll add it to the form for you." : STARTER[type]}</p>
            </div>
          </div>
        </div>

        <figure className="hm-setup-fig" data-reveal>
          <div className="hm-setup-frame" data-ui>
            {/* Blocks over the screen that clear one after another as it scrolls
                into view, like the import filling the site in (globals.css) */}
            <div className="hm-sk" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/hero/pv-website.webp"
              width={1120}
              height={700}
              loading="lazy"
              decoding="async"
              alt="A finished ordering site on a computer, with the restaurant's name, menu links, order button and this week's deals."
            />
          </div>
          <figcaption>A finished ordering site. Our demo restaurant, sample data.</figcaption>
        </figure>
      </div>
    </section>
  );
}

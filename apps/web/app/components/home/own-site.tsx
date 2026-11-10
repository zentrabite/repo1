"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useBusinessType, type BusinessType } from "./business-type";

// 6. See your own site. The visitor types their business name and it appears
// at the top of a sample ordering site on a phone, as an HTML bar laid over
// the screenshot. "Book a call" carries the name to the contact form
// (/contact?business=...), which fills it in.

// Same limit as the contact form's business name (LIMITS in app/contact/page.tsx).
const MAX = 160;

const EXAMPLE: Record<BusinessType, string> = {
  food: "Rosa's Pizza Bar",
  shops: "Port Road Hardware",
  salons: "Studio Nine Hair",
  trades: "Hills Plumbing",
};

/** yourname.zentrabite.com from what they typed. Letters and digits only. */
function subdomain(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
  return s.slice(0, 40) || "yourname";
}

/** Long names get smaller type so they stay on the bar. */
function barSize(name: string): string {
  const n = [...name].length;
  if (n <= 20) return "l";
  if (n <= 34) return "m";
  return "s";
}

export function OwnSite() {
  const { type } = useBusinessType();
  const [name, setName] = useState("");
  const id = useId();
  const clean = name.replace(/\s+/g, " ").trim();
  const shown = clean || "Your business";
  const href = clean ? `/contact?business=${encodeURIComponent(clean)}` : "/contact";

  return (
    <section className="hm-own" aria-labelledby="own-title" data-reveal>
      <div className="wrap hm-own-grid">
        <div className="hm-own-text">
          <h2 id="own-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            See it with your name on it.
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            Type your business name. We&apos;ll show it on a sample ordering site.
          </p>
          <div className="hm-own-form" data-r style={{ "--i": 2 } as React.CSSProperties}>
            <label htmlFor={id} className="hm-own-label">
              Your business name
            </label>
            <input
              id={id}
              className="input hm-own-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX}
              placeholder={`For example, ${EXAMPLE[type]}`}
              autoComplete="organization"
              enterKeyHint="done"
              spellCheck={false}
            />
            <div className="hm-own-actions">
              <Link href={href} className="btn-primary btn-lg">
                Book a call
              </Link>
              <p className="hm-own-note">
                {clean ? "We'll put your name on the form for you." : "No sign-up needed to try it."}
              </p>
            </div>
          </div>
        </div>

        <figure className="hm-own-fig" data-r style={{ "--i": 1 } as React.CSSProperties}>
          <div className="hm-own-phone" data-ui>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/hero/site-home-phone.webp"
              width={780}
              height={1688}
              loading="lazy"
              decoding="async"
              alt="A sample ordering site on a phone, with an order button and the shop's opening hours."
            />
            <div className={`hm-own-bar size-${barSize(shown)}`}>
              <span>{shown}</span>
            </div>
          </div>
          <figcaption>
            A sample site. Yours would live at{" "}
            <span className="hm-own-url">
              {subdomain(clean)}
              <wbr />
              .zentrabite.com
            </span>{" "}
            or on your own domain.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

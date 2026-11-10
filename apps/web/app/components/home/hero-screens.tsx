"use client";

import { useEffect, useRef, useState } from "react";

// The hero's three screens, in story order. On desktop the cart sits to the
// left of the two CRM panels. On a phone they're a row you swipe: two show
// whole, the third is a swipe away, and the dots follow the scroll.
// They rise in once, left to right, 90ms apart (CSS, .hm-shot). People who ask
// for less motion get them still.

const SHOTS = [
  {
    id: "cart",
    tag: "On their phone",
    text: "A customer orders on your own site.",
    src: "/media/hero/site-cart-phone-crop.webp",
    w: 780,
    h: 1210,
    alt: "A customer's cart on a restaurant's own ordering site, with the points they'll earn and a checkout button.",
  },
  {
    id: "profile",
    tag: "In your CRM",
    text: "They're saved to your customer list.",
    src: "/media/hero/crm-customer-profile-panel.webp",
    w: 960,
    h: 1560,
    alt: "A customer profile in the ZentraBite CRM, with their tier, points, contact details, lifetime value and orders.",
  },
  {
    id: "winback",
    tag: "In your CRM",
    text: "If they go quiet, they get a text.",
    src: "/media/hero/crm-winback-panel.webp",
    w: 840,
    h: 1172,
    alt: "A 30-day win-back campaign in ZentraBite, with the text message a quiet customer receives.",
  },
] as const;

export function HeroScreens() {
  const row = useRef<HTMLDivElement | null>(null);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        setDot(max > 4 ? Math.round((el.scrollLeft / max) * (SHOTS.length - 1)) : 0);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hm-shots-wrap">
      <div className="hm-shots" ref={row} role="group" aria-label="How it works, in three screens">
        {SHOTS.map((s, i) => (
          <figure key={s.id} className={`hm-shot hm-shot-${s.id}`} style={{ "--i": i } as React.CSSProperties}>
            <div className="hm-shot-frame" data-ui>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                width={s.w}
                height={s.h}
                alt={s.alt}
                decoding="async"
                fetchPriority={s.id === "profile" ? "high" : undefined}
                draggable={false}
              />
            </div>
            <figcaption>
              <span className="hm-tag">{s.tag}</span>
              {s.text}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="hm-shots-foot" data-launcher-avoid>
        <div className="hm-dots" aria-hidden="true">
          {SHOTS.map((s, i) => (
            <span key={s.id} className={i === dot ? "on" : undefined} />
          ))}
        </div>
        <p className="hm-note">Our demo restaurant, sample data.</p>
      </div>
    </div>
  );
}

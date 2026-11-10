"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBusinessType, type BusinessType } from "./business-type";

// 5. Everything in one place. An index of the parts of ZentraBite. Each row
// links to its feature page. On wide screens a frame beside the list shows a
// real screen: the customer list at rest and, with a mouse or the keyboard,
// the row being pointed at or tabbed to, level with that row. Phones and
// tablets get the list on its own.
// The business type picked above lights the rows that kind of business
// usually switches on.

type Row = { slug: string; name: string; short: string; preview: string; alt: string };

const ROWS: Row[] = [
  {
    slug: "custom-website",
    name: "Website",
    short: "Your own site, filled in from your current one.",
    preview: "pv-website",
    alt: "A restaurant's own website made with ZentraBite, with its hours, an order button and this week's deals.",
  },
  {
    slug: "storefronts",
    name: "Ordering and bookings",
    short: "Your menu, products or services, with card payments.",
    preview: "pv-ordering",
    alt: "The ordering menu on a phone, with pizzas and an add to cart button on each.",
  },
  {
    slug: "pos",
    name: "POS",
    short: "Take payments at the counter on the same system.",
    preview: "pv-pos",
    alt: "The ZentraBite POS, with the menu on the left and the current order on the right.",
  },
  {
    slug: "crm",
    name: "Customer list",
    short: "Every customer with their history and spend.",
    preview: "pv-customer-profile",
    alt: "A customer profile open over the customer list, with their spend, orders and quick actions.",
  },
  {
    slug: "winback",
    name: "Rewards",
    short: "Points, tiers and birthday bonuses.",
    preview: "pv-rewards",
    alt: "The rewards screen, with the points outstanding and the tier ladder from Bronze to VIP.",
  },
  {
    slug: "sms-email",
    name: "Win-back texts and emails",
    short: "Offers and reminders that send themselves.",
    preview: "pv-winback",
    alt: "Win-back campaigns, with what each one sent and how many customers came back.",
  },
  {
    slug: "reviews",
    name: "Reviews",
    short: "Every review in one place, plus review requests.",
    preview: "pv-reviews",
    alt: "Reviews from every platform in one list, with reply buttons.",
  },
  {
    slug: "stock-take",
    name: "Stock",
    short: "Counts, low-stock alerts and reorder drafts.",
    preview: "pv-stock",
    alt: "The stock screen, with items running low and a suggested reorder.",
  },
  {
    slug: "delivery-routing",
    name: "Delivery",
    short: "Your own drivers, or the best courier for each order.",
    preview: "pv-delivery",
    alt: "Delivery routing, with quotes from several couriers and the cheapest one picked.",
  },
];

// The frame shows from this width, with a mouse or not. Pointing at rows needs a mouse.
const WIDE = "(min-width: 1000px)";
const FINE = "(hover: hover) and (pointer: fine)";
const REST = ROWS.find((r) => r.slug === "crm")!;

const USED: Record<BusinessType, { who: string; line: string; slugs: string[] }> = {
  food: { who: "food businesses", line: "Food businesses tend to use all of them.", slugs: ROWS.map((r) => r.slug) },
  shops: {
    who: "shops",
    line: "Lit up: what shops usually switch on.",
    slugs: ["custom-website", "storefronts", "pos", "crm", "winback", "sms-email", "reviews", "stock-take"],
  },
  salons: {
    who: "salons and gyms",
    line: "Lit up: what salons and gyms usually switch on.",
    slugs: ["custom-website", "storefronts", "pos", "crm", "winback", "sms-email", "reviews"],
  },
  trades: {
    who: "trades",
    line: "Lit up: what trades usually switch on.",
    slugs: ["custom-website", "storefronts", "crm", "sms-email", "reviews"],
  },
};

export function FeatureIndex() {
  const { type } = useBusinessType();
  const used = USED[type];
  const root = useRef<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const rows = useRef<Record<string, HTMLAnchorElement | null>>({});
  // The row being pointed at. With none, the frame rests on the customer list,
  // the part every other part feeds.
  const [shown, setShown] = useState<Row | null>(null);
  const [y, setY] = useState(0);
  // Only a move between rows slides. Placing it the first time doesn't.
  const [moving, setMoving] = useState(false);
  const [ready, setReady] = useState(false);
  const warmed = useRef(false);
  const current = shown ?? REST;

  const place = useCallback((row: Row, slide: boolean) => {
    const el = rows.current[row.slug];
    if (!el || !root.current || !frame.current) return;
    // Level with the row, kept inside the list.
    const mid = el.offsetTop + el.offsetHeight / 2 - frame.current.offsetHeight / 2;
    const max = root.current.offsetHeight - frame.current.offsetHeight;
    setMoving(slide);
    setY(Math.min(Math.max(0, mid), Math.max(0, max)));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const rest = () => {
      setReady(mq.matches);
      if (mq.matches) place(REST, false);
    };
    rest();
    window.addEventListener("resize", rest);
    mq.addEventListener("change", rest);
    return () => {
      window.removeEventListener("resize", rest);
      mq.removeEventListener("change", rest);
    };
  }, [place]);

  function show(row: Row, byKeyboard = false) {
    if (!ready || (!byKeyboard && !window.matchMedia(FINE).matches)) return;
    if (!warmed.current) {
      warmed.current = true;
      for (const r of ROWS) new Image().src = `/media/hero/${r.preview}.webp`;
    }
    place(row, true);
    setShown(row);
  }

  function rest() {
    if (!ready) return;
    setShown(null);
    place(REST, true);
  }

  return (
    <section className="hm-index" aria-labelledby="index-title">
      <div className="wrap">
        <div className="hm-head hm-index-head" data-reveal>
          <h2 id="index-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            Switch on what you use.
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            Every part shares one customer list.{" "}
            <span key={type} className="hm-swap hm-index-who">
              {used.line}
            </span>
          </p>
        </div>

        <div
          className="hm-index-body"
          ref={root}
          data-reveal
          onPointerLeave={rest}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) rest();
          }}
        >
          <ul className="hm-index-list">
            {ROWS.map((r, i) => {
              const on = used.slugs.includes(r.slug);
              return (
                <li key={r.slug} data-r style={{ "--i": i } as React.CSSProperties}>
                  <Link
                    ref={(el) => {
                      rows.current[r.slug] = el;
                    }}
                    href={`/features/${r.slug}`}
                    className={`hm-row${on ? " on" : ""}${shown?.slug === r.slug ? " hover" : ""}`}
                    onPointerEnter={() => show(r)}
                    onFocus={() => show(r, true)}
                  >
                    <span className="hm-row-name">{r.name}</span>
                    <span className="hm-row-short">{r.short}</span>
                    {!on && <span className="sr-only"> (not usually needed for {used.who})</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div
            ref={frame}
            className={`hm-index-frame${ready ? " ready" : ""}${moving ? " moving" : ""}`}
            style={{ transform: `translateY(${y}px)` }}
            aria-hidden="true"
          >
            <div className="hm-index-in" data-r style={{ "--i": 2 } as React.CSSProperties}>
              <div className="hm-index-pic" data-ui>
                {ready && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={current.slug}
                    src={`/media/hero/${current.preview}.webp`}
                    alt=""
                    width={1120}
                    height={700}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <p className="hm-index-cap">
                <b>{current.name}.</b> {current.alt}
              </p>
            </div>
          </div>
        </div>

        <p className="hm-index-all">
          <Link href="/features" className="hm-link">
            See every feature
          </Link>
        </p>
      </div>
    </section>
  );
}

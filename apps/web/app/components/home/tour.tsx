"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppScreen } from "../app-screen";
import { useBusinessType, type BusinessType } from "./business-type";

// 3. The tour: follow one order through the real app, in five stops.
// Desktop: the screen holds still on the left while the stops pass on the
// right. The stop at the middle of the screen is lit and its clip plays; the
// others stay on their poster and don't load until they're reached.
// Phone and tablet: no pinning. Each stop has its own clip above its words.

type Clip = { id: string; variant: "phone" | "screen"; file: string; label: string };

const CLIPS: Clip[] = [
  {
    id: "storefront",
    variant: "phone",
    file: "storefront-phone",
    label: "A restaurant's own ordering site on a phone. A pizza is added to the cart and the customer reaches checkout.",
  },
  {
    id: "orders",
    variant: "screen",
    file: "orders-desktop",
    label: "The ZentraBite orders board. A new order is opened and moved from New to Cooking to Ready.",
  },
  {
    id: "customer",
    variant: "screen",
    file: "customer-desktop",
    label: "The customer list in ZentraBite. A regular is opened to show their tier, points, spend and order history.",
  },
  {
    id: "rewards",
    variant: "screen",
    file: "rewards-desktop",
    label: "Rewards in ZentraBite. The tier ladder and points, then a reward is redeemed from the catalogue.",
  },
  {
    id: "winback",
    variant: "screen",
    file: "winback-desktop",
    label: "Win-back campaigns in ZentraBite. A campaign is opened to show the personalised text it sends.",
  },
];

type Stop = { title: string; body: string };

const SAME_QUIET: Stop = {
  title: "If they go quiet, they get a text.",
  body: "You pick how long counts as quiet and what the offer is. ZentraBite sends it and shows you who came back.",
};

const STOPS: Record<BusinessType, Stop[]> = {
  food: [
    {
      title: "A customer orders on your own site.",
      body: "Your menu, your prices, your name at the top. They pay by card, Apple Pay or Google Pay through Stripe.",
    },
    {
      title: "It lands on your orders board.",
      body: "Orders from your site, the counter and the delivery apps, all on one board. Staff move each one from New to Cooking to Ready.",
    },
    {
      title: "They're saved to your customer list.",
      body: "Their name, contact details, what they order and how often. It's your list, not a delivery app's.",
    },
    { title: "They earn points.", body: "Points on every order, tiers for regulars and rewards they spend at checkout." },
    SAME_QUIET,
  ],
  shops: [
    {
      title: "A customer buys on your own site.",
      body: "Your products, your prices, your name at the top. They pay by card, Apple Pay or Google Pay through Stripe.",
    },
    {
      title: "It lands on your orders board.",
      body: "Online orders and counter sales in one place, ready to pack, collect or post.",
    },
    {
      title: "They're saved to your customer list.",
      body: "Their name, contact details, what they buy and how often. It's your list, not a marketplace's.",
    },
    { title: "They earn points.", body: "Points on every purchase, tiers for regulars and rewards they spend at checkout." },
    SAME_QUIET,
  ],
  salons: [
    {
      title: "A client books on your own site.",
      body: "Your services, times and prices, with your name at the top. They pay by card through Stripe.",
    },
    {
      title: "It lands on your board.",
      body: "Online bookings and walk-ins in one place, so the whole day is on one screen.",
    },
    {
      title: "They're saved to your client list.",
      body: "Their name, contact details, what they book and how often. It's your list, not a booking app's.",
    },
    { title: "They earn points.", body: "Points on every visit, tiers for regulars and rewards they spend next time." },
    {
      title: "If they don't rebook, they get a text.",
      body: "You pick how long counts as quiet and what the offer is. ZentraBite sends it and shows you who came back.",
    },
  ],
  trades: [
    {
      title: "A customer asks for a job on your own site.",
      body: "Your services and the areas you cover, with your name at the top. They send the details and you reply with a quote.",
    },
    {
      title: "It lands on your jobs board.",
      body: "Every request in one place. Move each job along from new to booked to done.",
    },
    {
      title: "They're saved to your customer list.",
      body: "Their name, address, what you did and when. It's your list, not a lead site's.",
    },
    { title: "They earn points.", body: "Points on every job, so they call you first next time." },
    {
      title: "When they're due, they get a text.",
      body: "A reminder when it's time for the next service. You pick the timing and the message.",
    },
  ],
};

function clipSources(file: string) {
  return [
    { src: `/media/app/${file}.mp4`, type: "video/mp4" },
    { src: `/media/app/${file}.webm`, type: "video/webm" },
  ];
}

export function Tour() {
  const { type } = useBusinessType();
  const stops = STOPS[type];
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // A band across the middle of the screen: the stop inside it is the one shown.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = items.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setActive(i);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="tour" className="hm-tour" aria-labelledby="tour-title">
      <div className="wrap">
        <div className="hm-head" data-reveal>
          <h2 id="tour-title" className="hm-h2" data-r style={{ "--i": 0 } as React.CSSProperties}>
            Follow one order.
          </h2>
          <p className="hm-lead" data-r style={{ "--i": 1 } as React.CSSProperties}>
            This is the real app, with our demo restaurant&apos;s sample data.
          </p>
        </div>

        <div className="hm-tour-grid">
          {/* Desktop stage: one clip at a time, held while the stops pass */}
          <div className="hm-stage">
            <div className="hm-stage-inner">
              <div className="hm-stage-box">
                {CLIPS.map((c, i) => (
                  <div
                    key={c.id}
                    className={`hm-stage-clip hm-stage-${c.variant}${i === active ? " on" : ""}`}
                    aria-hidden={i === active ? undefined : true}
                  >
                    <AppScreen
                      variant={c.variant}
                      poster={`/media/app/${c.file}.webp`}
                      sources={clipSources(c.file)}
                      label={c.label}
                      active={i === active}
                      pauseButton={false}
                    />
                  </div>
                ))}
              </div>
              <p className="hm-count" aria-hidden="true">
                {active + 1} of {CLIPS.length}
              </p>
            </div>
          </div>

          <ol className="hm-stops">
            {stops.map((s, i) => {
              const c = CLIPS[i]!;
              return (
                <li
                  key={c.id}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  className={`hm-stop${i === active ? " on" : ""}`}
                >
                  <AppScreen
                    className={`hm-stop-clip hm-stop-${c.variant}`}
                    variant={c.variant}
                    poster={`/media/app/${c.file}.webp`}
                    sources={clipSources(c.file)}
                    label={c.label}
                  />
                  <div className="hm-stop-text">
                    <h3 className="hm-h3">
                      <span key={type} className="hm-swap">
                        {s.title}
                      </span>
                    </h3>
                    <p>
                      <span key={type} className="hm-swap">
                        {s.body}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="hm-tour-end">
          <Link href="/demo/live" className="hm-link">
            Click through the live demo
          </Link>
        </p>
      </div>
    </section>
  );
}

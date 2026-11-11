"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { BusinessTypePicker, useBusinessType } from "../components/home/business-type";
import { FEATURE_GROUPS, type FeatureGroup } from "./groups";
import { FITS, GROUP_LEAD, previewOf } from "./media";
import { ChatPanel } from "./feature-screen";

// The list on /features (12 Nov). "How do your customers buy?" first, then
// each group of parts: its name, one line, and its rows. Parts that don't
// usually suit the picked way of buying are dimmed, not hidden. Every group
// shows one real screen: on a phone under the group's name, on a computer
// beside the rows, held in view while they pass and swapped to the row being
// pointed at (or focused).

export function FeatureDirectory() {
  const { type } = useBusinessType();
  const fits = FITS[type];
  const on = (slug: string) => fits === "all" || fits.includes(slug);

  return (
    <section className="fd" aria-label="Every part of ZentraBite">
      <div className="wrap">
        <div className="fd-pick">
          <BusinessTypePicker />
        </div>
        {FEATURE_GROUPS.map((g) => (
          <Group key={g.id} group={g} on={on} />
        ))}
      </div>
    </section>
  );
}

function Group({ group, on }: { group: FeatureGroup; on: (slug: string) => boolean }) {
  const first = group.items[0]!;
  const [shown, setShown] = useState(GROUP_LEAD[group.id] ?? first.slug);
  const current = group.items.find((i) => i.slug === shown) ?? first;
  const pic = previewOf(current.slug);

  return (
    <div className="fd-group" data-reveal>
      <div className="fd-head">
        <h2 className="fd-group-title">{group.title}</h2>
        <p className="fd-group-note">{group.note}</p>
      </div>
      <figure className="fd-group-pic">
        <div className="fd-sticky">
          <div className={`fd-pic${pic?.variant === "phone" ? " phone" : ""}`} data-ui data-r>
            {pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={pic.src} src={pic.src} alt={`${current.name} in ZentraBite.`} width={1120} height={700} loading="lazy" decoding="async" />
            ) : (
              <ChatPanel key="chat" />
            )}
          </div>
          <figcaption className="fd-cap">
            <b>{current.name}.</b> Our demo restaurant, sample data.
          </figcaption>
        </div>
      </figure>
      <ul className="fd-rows">
        {group.items.map((item, i) => (
          <li key={item.slug} style={{ "--i": i } as CSSProperties}>
            <Link
              href={`/features/${item.slug}`}
              className={`fd-row${on(item.slug) ? " on" : ""}${shown === item.slug ? " shown" : ""}`}
              onPointerEnter={() => setShown(item.slug)}
              onFocus={() => setShown(item.slug)}
            >
              <span className="fd-row-name">{item.name}</span>
              <span className="fd-row-short">{item.short}</span>
              {!on(item.slug) && <span className="sr-only"> (not usually needed for this way of buying)</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

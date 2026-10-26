"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./zb-icon";
import { FEATURE_GROUPS } from "../features/groups";
import { getFeature } from "../features/data";

// "What's inside" on the homepage. Pick a group, then every feature in it is a
// link to its own page. Hovering or tabbing onto one shows a preview on the
// right (desktop only). Styles are .ex-* in globals.css.

export function FeatureExplorer() {
  const [groupId, setGroupId] = useState(FEATURE_GROUPS[0]!.id);
  const group = FEATURE_GROUPS.find((g) => g.id === groupId) ?? FEATURE_GROUPS[0]!;
  const [activeSlug, setActiveSlug] = useState(group.items[0]!.slug);
  const activeItem = group.items.find((i) => i.slug === activeSlug) ?? group.items[0]!;
  const feature = getFeature(activeItem.slug);

  function pickGroup(id: string) {
    const g = FEATURE_GROUPS.find((x) => x.id === id);
    if (!g) return;
    setGroupId(id);
    setActiveSlug(g.items[0]!.slug);
  }

  return (
    <div className="ex">
      <div className="ex-tabs" role="tablist" aria-label="Feature groups">
        {FEATURE_GROUPS.map((g) => {
          const on = g.id === group.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              id={`ex-tab-${g.id}`}
              aria-selected={on}
              aria-controls="ex-panel-list"
              className="ex-tab"
              onClick={() => pickGroup(g.id)}
            >
              <Icon name={g.icon} size={20} />
              <span>{g.title}</span>
            </button>
          );
        })}
      </div>

      <div className="ex-body" id="ex-panel-list" role="tabpanel" aria-labelledby={`ex-tab-${group.id}`}>
        <div>
          <p className="ex-note">{group.note}</p>
          <ul className="ex-list">
            {group.items.map((item) => {
              const f = getFeature(item.slug);
              const on = item.slug === activeItem.slug;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/features/${item.slug}`}
                    className={`ex-item${on ? " on" : ""}`}
                    onMouseEnter={() => setActiveSlug(item.slug)}
                    onFocus={() => setActiveSlug(item.slug)}
                  >
                    <span className="ex-ico">{f && <Icon name={f.icon} size={22} />}</span>
                    <span className="ex-text">
                      <span className="ex-name">{item.name}</span>
                      <span className="ex-short">{item.short}</span>
                    </span>
                    <span className="ex-go" aria-hidden>
                      <Icon name="arrow-right" size={18} accent="currentColor" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {feature && (
          <aside className="ex-panel" aria-label={`${activeItem.name} preview`}>
            <div className="ex-panel-inner" key={feature.slug}>
              <span className="ex-panel-mark" aria-hidden>
                <Icon name={feature.icon} size={260} strokeWidth={1.25} />
              </span>
              <span className="ex-panel-ico" aria-hidden>
                <Icon name={feature.icon} size={28} />
              </span>
              <h3 className="ex-panel-title">{activeItem.name}</h3>
              <p className="ex-panel-tag">{feature.tagline}</p>
              <ol className="ex-steps">
                {feature.howItWorks.slice(0, 3).map((s) => (
                  <li key={s.title}>{s.title}</li>
                ))}
              </ol>
              <ul className="tick-list ex-bullets">
                {feature.bullets.slice(0, 4).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Link href={`/features/${feature.slug}`} className="btn-primary ex-panel-btn">
                Open the {activeItem.name} page
                <Icon name="arrow-right" size={18} accent="currentColor" />
              </Link>
            </div>
          </aside>
        )}
      </div>

      <p className="ex-all">
        <Link href="/features" className="text-link">
          See every feature on one page
        </Link>
      </p>
    </div>
  );
}

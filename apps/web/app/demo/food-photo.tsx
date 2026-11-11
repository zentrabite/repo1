// The demo restaurant's pictures (12 Nov). They replace the emoji it used to
// have for its logo, its food and its deals.
// - NonnaMark: Nonna's Kitchen's logo, a wood-fired oven in a round badge.
// - FoodPhoto: one menu item's photo. The photos are one matching set made with
//   AI for the demo (public/media/demo/food), so every dish looks like it came
//   out of the same kitchen. They stand in for a real restaurant's own photos.
// - DealPhotos: a deal's items as small overlapping photos.
// - preloadMenuPhotos: fetches every menu photo with the page, so switching
//   between categories (Pizzas, Drinks ...) never shows an empty tile.

"use client";

import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { menuItem, sampleMenuItems, type SampleDeal, type SampleMenuItem } from "./sample-business";

const ORANGE = "#E8641F";
const CREAM = "#FAF3E5";
const INK = "#1A1612";

export function NonnaMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="24" cy="24" r="24" fill={ORANGE} />
      {/* The oven's dome and its base */}
      <path d="M12 33V26.5a12 12 0 0 1 24 0V33Z" fill={CREAM} />
      <rect x="9.5" y="32" width="29" height="3.5" rx="1.75" fill={CREAM} />
      {/* The mouth, with the fire inside */}
      <path d="M18 32v-3a6 6 0 0 1 12 0v3Z" fill={INK} />
      <path d="M24 25.6c1.7 1.9 2.6 3.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.2.9-2.7 2.6-4.6Z" fill={ORANGE} />
      {/* The chimney */}
      <rect x="22.25" y="9.5" width="3.5" height="5.5" rx="1" fill={CREAM} />
    </svg>
  );
}

export function FoodPhoto({
  item,
  size,
  radius = 12,
  style,
}: {
  item: Pick<SampleMenuItem, "name" | "photo">;
  /** px, or a CSS length such as "100%" to fill its box */
  size: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.photo}
      alt=""
      width={640}
      height={640}
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{
        display: "block",
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: "cover",
        borderRadius: radius,
        background: "rgba(26,22,18,0.06)",
        ...style,
      }}
    />
  );
}

export function DealPhotos({ deal, size = 44, ring = "#FFFFFF" }: { deal: SampleDeal; size?: number; ring?: string }) {
  const items = deal.items.slice(0, 3).map((n) => menuItem(n));
  return (
    <div style={{ display: "flex", alignItems: "center" }} aria-hidden="true">
      {items.map((it, i) => (
        <FoodPhoto
          key={it.id}
          item={it}
          size={size}
          radius={size / 2}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.28, boxShadow: `0 0 0 2px ${ring}`, position: "relative", zIndex: 3 - i }}
        />
      ))}
    </div>
  );
}

/** Call at the top of a demo page's component. */
export function preloadMenuPhotos() {
  for (const m of sampleMenuItems) preload(m.photo, { as: "image" });
}

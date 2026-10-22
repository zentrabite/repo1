// The ZentraBite ZB mark (the newer logo, Oct 2026). The image lives in
// public/brand/zentrabite-mark.png and is about 1.3 times wider than tall.

/* eslint-disable @next/next/no-img-element */
export default function BrandMark({ size = 40, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/brand/zentrabite-mark.png"
      alt="ZentraBite"
      width={Math.round(size * 1.3)}
      height={size}
      style={{ display: "block", height: size, width: "auto", flexShrink: 0, ...style }}
    />
  );
}

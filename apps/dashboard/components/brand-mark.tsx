// The ZentraBite app icon: green rounded square, white ZB, navy dot.
// Used instead of the bare mark because the mark's navy dot disappears on
// the dark shell. Source and other variants: docs/reference/brand/logo/.

/* eslint-disable @next/next/no-img-element */
export default function BrandMark({ size = 40, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/brand/zentrabite-icon.svg"
      alt="ZentraBite"
      width={size}
      height={size}
      style={{ display: "block", width: size, height: size, flexShrink: 0, ...style }}
    />
  );
}

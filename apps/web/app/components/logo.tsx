// ZentraBite logo. The wordmark on its own by default (the nav and footer),
// or with the app icon (public/brand/zentrabite-icon.svg) when `mark` is set.
// "Bite" uses --logo-bite: brand green on dark grounds, a deeper green on light
// ones, where brand green is too faint to read (2.9 to 1). Other logo variants
// live in docs/reference/brand/logo/.
export function Logo({ size = 22, mark = false }: { size?: number; mark?: boolean }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      {mark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/zentrabite-icon.svg" alt="" width={size * 1.6} height={size * 1.6} className="logo-mark" />
      )}
      <span>
        <span className="logo-zentra">Zentra</span>
        <span className="logo-bite">Bite</span>
      </span>
    </span>
  );
}

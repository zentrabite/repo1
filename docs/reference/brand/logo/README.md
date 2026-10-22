# ZentraBite logo

Vector sources for the ZB logo, rebuilt in Oct 2026 from the approved app icon. Straight edges are true lines and the bowls are true arcs, so these scale to any size.

Colours are the brand tokens. Zentra Green `#00B67A`, Navy `#1C2D48`, White `#FFFFFF`.

| File | Use it for |
|---|---|
| `zentrabite-icon.svg` | The main logo. App icon, favicon, in-app logo, anywhere on dark or light |
| `zentrabite-icon-square.svg` | Full-bleed square. Apple touch icon, PWA maskable icon, social profile pictures that crop to a circle |
| `zentrabite-mark-green.svg` | Mark on its own, on white or light backgrounds |
| `zentrabite-mark-navy.svg` | Mark on its own, on white or light backgrounds when green is already busy |
| `zentrabite-mark-white.svg` | Mark on its own, on dark backgrounds |
| `zentrabite-glow-wide.svg` | Hero or banner image on dark, 3:2 |
| `zentrabite-glow-square.svg` | Social post or cover on dark, square |

## Rules

- Don't put the green mark with the navy dot on a dark background. The dot disappears. Use the icon or the white mark instead.
- Don't recolour, stretch or add effects outside the glow versions.
- Below 32px, use the icon, not the mark.

## Where the apps use it

- `apps/dashboard/public/brand/zentrabite-icon.svg` and `apps/web/public/brand/zentrabite-icon.svg`
- `app/icon.png` (512), `app/apple-icon.png` (180) and `app/favicon.ico` (16, 32, 48, 64) in both apps. The 16px and 32px favicon sizes use a larger glyph so it stays readable in a browser tab.

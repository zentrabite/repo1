# ZentraBite icons

Our own icon set, drawn Oct 2026 to replace emoji and the free Lucide pack. Rounded 24px line icons, 1.75 stroke, each with one accent element in Zentra Green, the same idea as the dot in the ZB logo.

- `icons_src.py` holds every drawing and the concept aliases (orders, menu, rewards...).
- `gen_tsx.py` writes `zb-icon.tsx` into both apps. Run it after any change:
  `python3 docs/reference/brand/icons/gen_tsx.py apps/dashboard/components/zb-icon.tsx apps/web/app/components/zb-icon.tsx`
- `preview.py` renders a sheet of the whole set: `python3 docs/reference/brand/icons/preview.py sheet.png`

## Using them

```tsx
<Icon name="orders" />                        // 20px, inherits text colour
<Icon name="tier" size={28} accent="#F5B83D" /> // gold medal
```

The accent comes from the `accent` prop or the `--zb-ia` CSS variable on a parent. It defaults to Zentra Green.

## Rules

- No emoji as icons in the UI. Use an icon, or nothing.
- Text symbols that work as text are fine (the ✓ in a toast, ★ in a rating, → in a link).
- Add a new drawing to `icons_src.py` instead of pulling in an icon pack.

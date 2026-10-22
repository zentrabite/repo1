"""Generate zb-icon.tsx for both apps from icons_src.py."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from icons_src import ICONS, ALIASES

def num(v):
    return float(v) if isinstance(v, (int, float)) else v

data = {}
for name, els in ICONS.items():
    out = []
    for tag, attrs, mode in els:
        a = {k: (round(v, 3) if isinstance(v, float) else v) for k, v in attrs.items()}
        out.append([tag, a, mode])
    data[name] = out

body = json.dumps(data, separators=(",", ":"))
aliases = json.dumps(ALIASES, indent=2)

TSX = f'''// ─── ZentraBite icons ───────────────────────────────────────────────────────
// Our own icon set (Oct 2026). Rounded 24px line icons, each with one accent
// element in Zentra Green, the same idea as the dot in the ZB logo.
//
// GENERATED FILE. Don't edit by hand. The drawings live in
// docs/reference/brand/icons/icons_src.py and both apps get the same copy:
//   python3 docs/reference/brand/icons/gen_tsx.py
//
// Usage:
//   <Icon name="orders" />                 20px, inherits text colour
//   <Icon name="rewards" size={28} accent="#FFC14B" />
//   const Orders = iconComponent("orders")   for places that take a component
//
// The accent colour comes from the `accent` prop, or the CSS variable
// --zb-ia on any parent. Defaults to Zentra Green.

import type {{ CSSProperties }} from "react";

type Mode = "s" | "a" | "f" | "c" | "w";
type El = [tag: "path" | "circle" | "rect", attrs: Record<string, string | number>, mode: Mode];

const ICONS = {body} as const satisfies Record<string, readonly (readonly unknown[])[]>;

const ALIASES = {aliases} as const;

export type IconName = keyof typeof ICONS | keyof typeof ALIASES;
export const ICON_NAMES = Object.keys(ICONS) as (keyof typeof ICONS)[];

/** True when a string is one of our icon names or aliases (not an emoji or text). */
export function isIconName(x: unknown): x is IconName {{
  return typeof x === "string" && (x in ICONS || x in ALIASES);
}}

const MODE: Record<Mode, Record<string, string>> = {{
  s: {{}},
  a: {{ stroke: "var(--zb-ia, #00B67A)" }},
  f: {{ fill: "var(--zb-ia, #00B67A)", stroke: "none" }},
  c: {{ fill: "currentColor", stroke: "none" }},
  w: {{ stroke: "var(--zb-ib, #FFFFFF)" }},
}};

export type IconProps = {{
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  /** Accent colour for this icon. Defaults to --zb-ia, then Zentra Green. */
  accent?: string;
  /** Label for screen readers. Leave out when the icon sits next to text. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}};

export function Icon({{ name, size = 20, strokeWidth = 1.75, accent, title, className, style }}: IconProps) {{
  const key = (ALIASES as Record<string, string>)[name] ?? name;
  const els = (ICONS as unknown as Record<string, El[]>)[key];
  if (!els) return null;
  const vars = accent ? ({{ ["--zb-ia" as string]: accent }} as CSSProperties) : undefined;
  return (
    <svg
      width={{size}}
      height={{size}}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={{strokeWidth}}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={{title ? "img" : undefined}}
      aria-hidden={{title ? undefined : true}}
      className={{className}}
      style={{{{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...vars, ...style }}}}
    >
      {{title ? <title>{{title}}</title> : null}}
      {{els.map(([tag, attrs, mode], i) => {{
        const Tag = tag;
        return <Tag key={{i}} {{...attrs}} {{...MODE[mode]}} />;
      }})}}
    </svg>
  );
}}

/** A component for one icon, for places that expect a component (like nav items). */
export function iconComponent(name: IconName) {{
  function ZbIcon(props: Omit<IconProps, "name">) {{
    return <Icon name={{name}} {{...props}} />;
  }}
  ZbIcon.displayName = `Icon(${{name}})`;
  return ZbIcon;
}}

export type IconComponent = ReturnType<typeof iconComponent>;
'''

for target in sys.argv[1:]:
    Path(target).write_text(TSX)
    print("wrote", target)

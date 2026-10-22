"""Render a preview sheet of the icon set with headless Chromium."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from icons_src import ICONS

STYLE = {
    "s": 'fill="none" stroke="currentColor"',
    "a": 'fill="none" stroke="var(--zb-ia)"',
    "f": 'fill="var(--zb-ia)" stroke="none"',
    "c": 'fill="currentColor" stroke="none"',
    "w": 'fill="none" stroke="var(--zb-ib)"',
}


def svg(name, size=24, sw=1.75):
    parts = []
    for tag, attrs, mode in ICONS[name]:
        a = " ".join(f'{k}="{v}"' for k, v in attrs.items())
        parts.append(f"<{tag} {a} {STYLE[mode]}/>")
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{"".join(parts)}</svg>')


def page(names, big=44, small=20):
    cells = "".join(
        f'<div class="c"><div class="i">{svg(n, big)}</div><div class="s">{svg(n, small)}</div><div class="n">{n}</div></div>'
        for n in names)
    return f"""<!doctype html><html><head><style>
    body{{margin:0;font-family:system-ui,sans-serif;background:#0F1F2D;color:#E6EDF5;--zb-ia:#00B67A;--zb-ib:#fff}}
    .g{{display:grid;grid-template-columns:repeat(10,1fr);gap:10px;padding:18px}}
    .c{{background:rgba(28,45,72,.55);border:1px solid rgba(226,232,240,.08);border-radius:12px;padding:12px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:8px}}
    .s{{color:#8FA0B5}} .n{{font-size:10.5px;color:#8FA0B5}}
    .light{{background:#F8FAFB;color:#1C2D48}} .light .c{{background:#fff;border-color:#E2E8F0}} .light .s,.light .n{{color:#6B7C93}}
    </style></head><body><div class="g">{cells}</div><div class="g light">{cells}</div></body></html>"""


async def main(out):
    names = list(ICONS)
    html = page(names)
    rows = (len(names) + 9) // 10
    h = 2 * (rows * 118 + 36)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1300, "height": h}, device_scale_factor=1.5)
        await pg.set_content(html)
        await pg.screenshot(path=out, full_page=True)
        await b.close()

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "sheet.png"))

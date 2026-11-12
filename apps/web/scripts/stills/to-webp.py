# Turns the PNGs from site.cjs, features.cjs and crm.cjs into the site's webp stills,
# at the size each file already has in public/media. The customer app shot loses its
# status bar first (the top 96px of the 2x capture), the same crop the site uses.
#   python3 to-webp.py stills-out
import sys, os
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else 'stills-out'
media = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'media')
TARGETS = {
    'pv-website': 'hero', 'pv-ordering': 'hero', 'pv-pos': 'hero', 'site-home-phone': 'hero',
    'pv-delivery': 'hero', 'pv-reviews': 'hero', 'pv-rewards': 'hero', 'pv-stock': 'hero',
    'pv-winback': 'hero', 'pv-customer-profile': 'hero', 'crm-customer-profile-panel': 'hero',
    'fp-ai-calls': 'features', 'fp-automations': 'features', 'fp-custom-mobile-app': 'features',
    'fp-financial-reporting': 'features', 'fp-fulfillment': 'features', 'fp-rostering': 'features',
    'fp-stripe-payouts': 'features',
}
for name, folder in TARGETS.items():
    p = os.path.join(src, name + '.png')
    if not os.path.exists(p):
        print('missing', name); continue
    dst = os.path.join(media, folder, name + '.webp')
    size = Image.open(dst).size if os.path.exists(dst) else None
    im = Image.open(p).convert('RGB')
    if name == 'fp-custom-mobile-app':
        im = im.crop((0, 96, im.size[0], im.size[1]))
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    im.save(dst, 'WEBP', quality=84, method=6)
    print(f'{name:28} -> {dst} {im.size}')

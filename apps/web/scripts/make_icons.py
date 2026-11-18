# Regenerate the app icons from the SpoolMark glyph (components/layout/spool-mark.tsx).
# Usage from the repo root: python apps/web/scripts/make_icons.py apps/web   (needs Pillow)
"""Render the SpoolMark glyph (24-unit viewBox) as app icons."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

BG = (14, 14, 13)          # --background dark
RING = (71, 70, 68)        # foreground at 25 % over BG
ACCENT = (242, 179, 61)    # --primary dark
DOT = (242, 241, 236)      # --foreground dark
SS = 4                     # supersampling

def glyph(size, glyph_frac, radius_frac=0.0):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if radius_frac:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), fill=BG)
    else:
        d.rectangle([0, 0, S, S], fill=BG)
    unit = S * glyph_frac / 22.0          # glyph outer diameter = 22 units (r 9.5 + stroke 1.5)
    c = S / 2
    r, w = 9.5 * unit, 3 * unit
    box = [c - r - w / 2, c - r - w / 2, c + r + w / 2, c + r + w / 2]
    d.ellipse(box, outline=RING, width=round(w))
    d.arc(box, -90, 0, fill=ACCENT, width=round(w))
    for x, y in ((c, c - r), (c + r, c)):   # round caps
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ACCENT)
    dr = 2.5 * unit
    d.ellipse([c - dr, c - dr, c + dr, c + dr], fill=DOT)
    return img.resize((size, size), Image.LANCZOS)

web = Path(sys.argv[1])
icons = web / "public" / "icons"
icons.mkdir(parents=True, exist_ok=True)
glyph(192, 0.62, 0.18).save(icons / "icon-192.png")
glyph(512, 0.62, 0.18).save(icons / "icon-512.png")
glyph(512, 0.50).save(icons / "icon-maskable-512.png")       # inside the 80 % safe circle
glyph(180, 0.60).save(web / "src" / "app" / "apple-icon.png")  # iOS rounds it itself
fav = glyph(256, 0.84, 0.2)
fav.save(web / "src" / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
glyph(512, 0.84, 0.2).save(web / "src" / "app" / "icon.png")
print("ok")

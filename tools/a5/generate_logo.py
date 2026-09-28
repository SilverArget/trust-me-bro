"""Generate the A5c1 PLACEHOLDER brand family using only Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "sprites" / "a5" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

NAVY, INK, YELLOW, CYAN, WHITE = "#08151f", "#111820", "#f2c84b", "#65dcff", "#f7fbff"

def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try: return ImageFont.truetype(name, size)
        except OSError: pass
    return ImageFont.load_default()

def brand(size, compact=False):
    w, h = size
    im = Image.new("RGB", size, NAVY)
    d = ImageDraw.Draw(im)
    stripe = max(8, h // 14)
    for x in range(-h, w + h, stripe * 3):
        d.polygon([(x, h), (x + stripe, h), (x + h // 3 + stripe, h - stripe), (x + h // 3, h - stripe)], fill=YELLOW)
    pad = max(8, w // 24)
    fs = min(h // (3 if compact else 2), w // (7 if compact else 8))
    text = "TMB" if compact else "TRUST ME BRO"
    f = font(fs)
    box = d.textbbox((0, 0), text, font=f, stroke_width=max(1, fs // 28))
    tw, th = box[2] - box[0], box[3] - box[1]
    tx, ty = pad, max(pad, (h - stripe - th) // 2)
    d.text((tx, ty), text, font=f, fill=WHITE, stroke_width=max(1, fs // 28), stroke_fill=INK)
    ax = min(w - pad, tx + tw + pad)
    ay = h // 2
    d.polygon([(ax - h//8, ay-h//16), (ax, ay-h//16), (ax, ay-h//8), (ax+h//7, ay), (ax, ay+h//8), (ax, ay+h//16), (ax-h//8, ay+h//16)], fill=CYAN)
    return im

targets = {
    "trust-me-bro-logo.png": ((1024, 384), False),
    "trust-me-bro-icon-512.png": ((512, 512), True),
    "trust-me-bro-icon-48.png": ((48, 48), True),
    "trust-me-bro-store-cover.png": ((1200, 630), False),
}
for name, (size, compact) in targets.items():
    brand(size, compact).save(OUT / name, optimize=True)
    print(f"{name} {size[0]}x{size[1]}")

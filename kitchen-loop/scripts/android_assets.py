"""Android launcher icons and splash screens from assets/ref/icon_final.png (only read and resized, spec 9.1).

Usage: python3 scripts/android_assets.py   (needs Pillow). Writes into android/app/src/main/res.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / 'assets' / 'ref' / 'icon_final.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
TOP = (74, 51, 38)  # --bg-top
BOTTOM = (43, 29, 20)  # --bg
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def artwork():
    icon = Image.open(ICON).convert('RGBA')
    return icon.crop(icon.getbbox())


def gradient(w, h):
    img = Image.new('RGBA', (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        k = y / max(1, h - 1)
        draw.line([(0, y), (w, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip(TOP, BOTTOM)) + (255,))
    return img


def paste_centered(base, art, width_share, dy=0.0):
    w = round(base.width * width_share)
    h = round(w * art.height / art.width)
    scaled = art.resize((w, h), Image.LANCZOS)
    base.alpha_composite(scaled, ((base.width - w) // 2, (base.height - h) // 2 + round(base.height * dy)))
    return base


def masked(img, shape):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    box = (0, 0, img.width - 1, img.height - 1)
    if shape == 'round':
        draw.ellipse(box, fill=255)
    else:
        draw.rounded_rectangle(box, radius=round(img.width * 0.18), fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main():
    art = artwork()
    for name, d in DENSITIES.items():
        folder = RES / f'mipmap-{name}'
        size = round(48 * d)
        legacy = paste_centered(gradient(size, size), art, 0.9)
        masked(legacy, 'square').save(folder / 'ic_launcher.png')
        masked(paste_centered(gradient(size, size), art, 0.84), 'round').save(folder / 'ic_launcher_round.png')
        # Adaptive icon: 108 dp, the launcher shows the middle 72 dp (mask safe zone 66 dp).
        fg = round(108 * d)
        paste_centered(Image.new('RGBA', (fg, fg), (0, 0, 0, 0)), art, 0.68).save(folder / 'ic_launcher_foreground.png')
    for folder in RES.glob('drawable*'):
        splash = folder / 'splash.png'
        if not splash.exists():
            continue
        w, h = Image.open(splash).size
        share = 0.62 if h > w else 0.34
        paste_centered(gradient(w, h), art, share, -0.04).convert('RGB').save(splash)


if __name__ == '__main__':
    main()

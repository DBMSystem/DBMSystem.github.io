"""HD kitchen behind the story scenes (Daniel: "se ve muy pixelado, hazlo más HD, y en vez de pimientos de colores
que haya utensilios de cocina, como una paleta, un cazo, unas pinzas").

Dev tool, not part of the game: `python3 scripts/story_backdrop.py` (needs Pillow + numpy).
Paints Pip's kitchen in smooth, outlined cartoon style at 1080 × 2100 (drawn at twice the size and scaled down, so
every edge is antialiased): window, pendant lamps, a shelf of jars, a rail of hanging utensils (spatula, ladle,
saucepan, tongs, whisk) and the counter. The bottom stays calm: the dialogue bubble and Pip sit there.
Outputs src/assets/sprites/ui/scene_day.jpg and scene_night.jpg.
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "sprites" / "ui"
W, H = 1080, 2100
S = 2  # supersampling
INK = (59, 42, 32, 255)
LINE = 5  # outline width, in final pixels


def px(v):
    return round(v * S)


def box(x0, y0, x1, y1):
    return (px(x0), px(y0), px(x1), px(y1))


def vgrad(w, h, top, bottom):
    t = np.linspace(0, 1, h)[:, None, None]
    a = np.array(top, float)[None, None, :] * (1 - t) + np.array(bottom, float)[None, None, :] * t
    return np.repeat(a, w, axis=1)


def hgrad(w, h, left, right):
    t = np.linspace(0, 1, w)[None, :, None]
    a = np.array(left, float)[None, None, :] * (1 - t) + np.array(right, float)[None, None, :] * t
    return np.repeat(a, h, axis=0)


class Canvas:
    def __init__(self):
        self.img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 255))
        self.d = ImageDraw.Draw(self.img)

    # A shape with a dark outline: `draw(d, inset)` draws the shape grown by `inset` final pixels.
    def outlined(self, shape, args, fill, line=LINE):
        getattr(self.d, shape)(*self._grow(shape, args, line), fill=INK)
        getattr(self.d, shape)(*args, fill=fill)

    def _grow(self, shape, args, line):
        g = px(line)
        if shape in ("rectangle", "ellipse"):
            x0, y0, x1, y1 = args[0]
            return [(x0 - g, y0 - g, x1 + g, y1 + g)]
        if shape == "rounded_rectangle":
            x0, y0, x1, y1 = args[0]
            return [(x0 - g, y0 - g, x1 + g, y1 + g), args[1] + g]
        if shape == "polygon":
            pts = args[0]
            cx = sum(p[0] for p in pts) / len(pts)
            cy = sum(p[1] for p in pts) / len(pts)
            grown = []
            for x, y in pts:
                dx, dy = x - cx, y - cy
                d = math.hypot(dx, dy) or 1
                grown.append((x + dx / d * g, y + dy / d * g))
            return [grown]
        raise ValueError(shape)

    # Fills the area of a mask with a gradient array (h, w, 3) in canvas pixels.
    def fill_mask(self, mask, colors, x0=0, y0=0):
        layer = Image.fromarray(np.clip(colors, 0, 255).astype("uint8"), "RGB").convert("RGBA")
        full = Image.new("RGBA", self.img.size)
        full.paste(layer, (x0, y0))
        self.img.paste(full, (0, 0), mask)

    def mask(self):
        return Image.new("L", self.img.size, 0)

    def glow(self, center, radius, color, strength=1.0):
        """Additive warm light."""
        cx, cy = px(center[0]), px(center[1])
        r = px(radius)
        h, w = self.img.size[1], self.img.size[0]
        y0, y1, x0, x1 = max(0, cy - r), min(h, cy + r), max(0, cx - r), min(w, cx + r)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
        k = np.clip(1 - d, 0, 1) ** 2 * strength
        a = np.asarray(self.img).astype(float)
        a[y0:y1, x0:x1, :3] += k[..., None] * np.array(color, float)[None, None, :]
        self.img = Image.fromarray(np.clip(a, 0, 255).astype("uint8"), "RGBA")
        self.d = ImageDraw.Draw(self.img)


# ---------------------------------------------------------------- scene pieces

def wall(c, night):
    top, bottom = ((243, 225, 196), (232, 206, 168)) if not night else ((110, 90, 104), (92, 74, 90))
    c.img.paste(Image.fromarray(vgrad(W * S, px(1250), top, bottom).astype("uint8"), "RGB"), (0, 0))
    c.d = ImageDraw.Draw(c.img)
    # Ceiling beam
    c.d.rectangle(box(0, 0, W, 70), fill=(120, 78, 50, 255) if not night else (60, 44, 46, 255))
    c.d.rectangle(box(0, 70, W, 80), fill=INK)
    # Tiled backsplash behind the counter
    tile, grout = ((250, 246, 238), (214, 200, 182)) if not night else ((140, 126, 140), (100, 88, 104))
    c.d.rectangle(box(0, 960, W, 1250), fill=grout + (255,))
    tw, th = 120, 58
    for row, y in enumerate(range(960, 1250, th)):
        offset = (row % 2) * tw // 2
        for x in range(-tw, W + tw, tw):
            x0 = x + offset
            c.d.rounded_rectangle(box(x0 + 4, y + 4, x0 + tw - 4, y + th - 4), px(6), fill=tile + (255,))
            c.d.rectangle(box(x0 + 12, y + 10, x0 + tw - 40, y + 16), fill=(255, 255, 255, 140) if not night else (130, 126, 160, 255))


def window(c, night):
    x0, y0, x1, y1 = 90, 330, 430, 780
    c.outlined("rounded_rectangle", [box(x0, y0, x1, y1), px(18)], (170, 112, 66, 255), line=6)
    gx0, gy0, gx1, gy1 = x0 + 26, y0 + 26, x1 - 26, y1 - 26
    gw, gh = px(gx1 - gx0), px(gy1 - gy0)
    top, bottom = ((24, 30, 74), (64, 52, 112)) if night else ((120, 190, 245), (205, 236, 255))
    glass = Image.fromarray(vgrad(gw, gh, top, bottom).astype("uint8"), "RGB").convert("RGBA")
    g = ImageDraw.Draw(glass)
    lx = lambda v: px(v)  # glass-local coordinates, in final pixels from the glass corner
    w, h = gx1 - gx0, gy1 - gy0
    if night:
        g.ellipse((lx(w - 120), lx(40), lx(w - 50), lx(110)), fill=(255, 238, 170, 255))
        g.ellipse((lx(w - 100), lx(30), lx(w - 36), lx(94)), fill=top + (255,))
        rng = np.random.default_rng(3)
        for _ in range(26):
            sx, sy, r = rng.uniform(10, w - 10), rng.uniform(10, h - 120), rng.uniform(1.5, 3.5)
            g.ellipse((lx(sx - r), lx(sy - r), lx(sx + r), lx(sy + r)), fill=(255, 250, 220, 255))
        hills = ((40, 60, 96), (34, 50, 84))
    else:
        for cx, cy, k in ((90, 90, 1.0), (w - 70, 170, 0.75)):
            for dx, dy, r in ((-40, 8, 30), (0, -6, 40), (42, 6, 32), (10, 18, 34)):
                g.ellipse((lx(cx + (dx - r) * k), lx(cy + (dy - r) * k), lx(cx + (dx + r) * k), lx(cy + (dy + r) * k)), fill=(255, 255, 255, 235))
        hills = ((140, 200, 120), (118, 182, 104))
    g.ellipse((lx(-80), lx(h - 90), lx(220), lx(h + 120)), fill=hills[0] + (255,))
    g.ellipse((lx(120), lx(h - 70), lx(w + 80), lx(h + 140)), fill=hills[1] + (255,))
    shine = Image.new("RGBA", glass.size)
    ImageDraw.Draw(shine).polygon([(lx(30), lx(h - 40)), (lx(70), lx(h - 40)), (lx(140), lx(30)), (lx(100), lx(30))], fill=(255, 255, 255, 50))
    glass.alpha_composite(shine)
    c.img.alpha_composite(glass, (px(gx0), px(gy0)))
    c.d = ImageDraw.Draw(c.img)
    # Mullions
    mx, my = (gx0 + gx1) / 2, (gy0 + gy1) / 2
    c.d.rectangle(box(mx - 8, gy0, mx + 8, gy1), fill=(170, 112, 66, 255))
    c.d.rectangle(box(gx0, my - 8, gx1, my + 8), fill=(170, 112, 66, 255))
    # Sill and a little herb pot
    c.outlined("rounded_rectangle", [box(x0 - 24, y1 - 6, x1 + 24, y1 + 22), px(8)], (196, 136, 84, 255))
    pot = [(px(300), px(y1 - 6)), (px(380), px(y1 - 6)), (px(370), px(y1 - 62)), (px(310), px(y1 - 62))]
    c.outlined("polygon", [pot], (214, 112, 72, 255))
    for k, (dx, h) in enumerate(((-26, 90), (-8, 120), (12, 104), (30, 80))):
        bx = 340 + dx
        c.outlined("ellipse", [box(bx - 14, y1 - 62 - h, bx + 14, y1 - 62 - h + 50)], (88, 170, 92, 255), line=4)
        c.d.line([(px(bx), px(y1 - 62)), (px(bx), px(y1 - 62 - h + 30))], fill=(60, 120, 60, 255), width=px(5))
    # Gingham curtains
    for left in (True, False):
        cx0 = x0 - 40 if left else x1 - 70
        cx1 = cx0 + 110
        pts = [(cx0, y0 - 40), (cx1, y0 - 40), (cx1 - (0 if left else 30), y0 + 160), (cx0 + (40 if left else 0), y0 + 300), (cx0, y0 + 300)] if left else \
              [(cx0, y0 - 40), (cx1, y0 - 40), (cx1, y0 + 300), (cx1 - 40, y0 + 300), (cx0 + 30, y0 + 160)]
        poly = [(px(a), px(b)) for a, b in pts]
        c.outlined("polygon", [poly], (250, 244, 236, 255), line=5)
        m = c.mask()
        ImageDraw.Draw(m).polygon(poly, fill=255)
        check = np.zeros((H * S, W * S, 3))
        yy, xx = np.mgrid[0:H * S, 0:W * S]
        cell = px(26)
        on = ((xx // cell) + (yy // cell)) % 2 == 0
        stripes = ((xx // cell) % 2 == 0) | ((yy // cell) % 2 == 0)
        check[...] = (250, 244, 236)
        check[stripes] = (232, 128, 128)
        check[on & stripes & ((xx // cell) % 2 == 0) & ((yy // cell) % 2 == 0)] = (206, 82, 82)
        gm = Image.fromarray(np.where(stripes, 255, 0).astype("uint8"), "L")
        mm = Image.fromarray(np.minimum(np.asarray(m), np.asarray(gm)).astype("uint8"), "L")
        c.img.paste(Image.fromarray(check.astype("uint8"), "RGB").convert("RGBA"), (0, 0), mm)
        c.d = ImageDraw.Draw(c.img)
    # curtain rod
    c.outlined("rounded_rectangle", [box(x0 - 60, y0 - 52, x1 + 60, y0 - 36), px(8)], (150, 100, 60, 255), line=4)


def lamps(c, night):
    for cx in (330, 790):
        c.d.line([(px(cx), px(80)), (px(cx), px(120))], fill=INK, width=px(5))
        shade = [(px(cx - 80), px(196)), (px(cx + 80), px(196)), (px(cx + 38), px(122)), (px(cx - 38), px(122))]
        c.outlined("polygon", [shade], (92, 136, 120, 255) if not night else (70, 104, 96, 255))
        c.d.rectangle(box(cx - 72, 184, cx + 72, 194), fill=(70, 108, 96, 255))
        c.outlined("ellipse", [box(cx - 22, 188, cx + 22, 218)], (255, 240, 180, 255), line=4)


def lamp_light(c, night):
    for cx in (330, 790):
        c.glow((cx, 210), 420 if night else 280, (150, 110, 40) if night else (60, 46, 12), 1.0)


def shelf(c, night):
    sx0, sx1, sy = 480, 1040, 430
    c.outlined("rounded_rectangle", [box(sx0, sy, sx1, sy + 26), px(6)], (186, 124, 74, 255))
    for bx in (sx0 + 40, sx1 - 60):
        c.outlined("polygon", [[(px(bx), px(sy + 26)), (px(bx + 20), px(sy + 26)), (px(bx + 20), px(sy + 70))]], (150, 98, 58, 255), line=4)
    jars = [(520, 120, 70, (245, 236, 220), (226, 92, 62)), (610, 150, 80, (240, 200, 110), (120, 160, 90)),
            (710, 110, 64, (196, 132, 78), (70, 110, 170)), (795, 140, 76, (250, 250, 245), (210, 160, 70)),
            (890, 104, 62, (140, 90, 60), (226, 92, 62)), (970, 128, 58, (230, 120, 70), (120, 160, 90))]
    for x, h, w, content, lid in jars:
        y1 = sy
        y0 = y1 - h
        c.outlined("rounded_rectangle", [box(x - w / 2, y0, x + w / 2, y1), px(14)], (214, 236, 240, 255), line=4)
        c.d.rounded_rectangle(box(x - w / 2 + 6, y0 + h * 0.35, x + w / 2 - 6, y1 - 6), px(10), fill=content + (255,))
        c.outlined("rounded_rectangle", [box(x - w / 2 - 4, y0 - 18, x + w / 2 + 4, y0 + 4), px(6)], lid + (255,), line=4)
        c.d.rectangle(box(x - w / 2 + 10, y0 + 14, x - w / 2 + 18, y1 - 16), fill=(255, 255, 255, 170))


# Hanging utensils: each takes the point of its hook (x, y) and hangs below it.
STEEL = (196, 204, 212, 255)
STEEL_DARK = (150, 160, 170, 255)
WOOD = (214, 160, 100, 255)
COPPER = (214, 118, 70, 255)


def hook(c, x, y):
    c.d.arc(box(x - 12, y - 4, x + 12, y + 20), 180, 360, fill=INK, width=px(5))
    c.d.arc(box(x - 12, y + 12, x + 12, y + 36), 0, 180, fill=INK, width=px(5))


def spatula(c, x, y):
    c.outlined("rounded_rectangle", [box(x - 11, y + 30, x + 11, y + 230), px(10)], WOOD)
    c.d.ellipse(box(x - 5, y + 42, x + 5, y + 52), fill=INK)
    blade = box(x - 42, y + 210, x + 42, y + 330)
    c.outlined("rounded_rectangle", [blade, px(22)], WOOD)
    for dx in (-18, 0, 18):
        c.d.rounded_rectangle(box(x + dx - 4, y + 238, x + dx + 4, y + 304), px(4), fill=(150, 100, 56, 255))
    c.d.rectangle(box(x - 6, y + 60, x - 2, y + 210), fill=(240, 196, 140, 255))


def ladle(c, x, y):
    c.outlined("rounded_rectangle", [box(x - 8, y + 30, x + 8, y + 250), px(8)], STEEL)
    c.outlined("ellipse", [box(x - 58, y + 230, x + 58, y + 330)], STEEL)
    c.d.ellipse(box(x - 46, y + 238, x + 46, y + 300), fill=STEEL_DARK)
    c.d.arc(box(x - 40, y + 300, x + 30, y + 324), 200, 330, fill=(255, 255, 255, 220), width=px(5))
    c.d.rectangle(box(x - 4, y + 40, x - 1, y + 230), fill=(240, 244, 248, 255))


def saucepan(c, x, y):
    # the handle hangs from the hook, the pan below it, opening facing us (a "cazo")
    c.outlined("rounded_rectangle", [box(x - 12, y + 30, x + 12, y + 170), px(10)], (80, 60, 50, 255))
    c.d.ellipse(box(x - 5, y + 42, x + 5, y + 52), fill=(240, 220, 200, 255))
    c.outlined("ellipse", [box(x - 95, y + 160, x + 95, y + 350)], COPPER)
    c.d.ellipse(box(x - 76, y + 178, x + 76, y + 332), fill=(150, 76, 44, 255))
    c.d.ellipse(box(x - 64, y + 190, x + 64, y + 320), fill=(196, 104, 62, 255))
    c.d.arc(box(x - 66, y + 192, x + 50, y + 300), 200, 300, fill=(255, 210, 170, 255), width=px(8))


def tongs(c, x, y):
    c.outlined("ellipse", [box(x - 22, y + 26, x + 22, y + 70)], STEEL)
    c.d.ellipse(box(x - 10, y + 38, x + 10, y + 58), fill=(232, 206, 168, 255))
    for side in (-1, 1):
        arm = [(px(x + side * 6), px(y + 64)), (px(x + side * 22), px(y + 64)), (px(x + side * 50), px(y + 300)), (px(x + side * 30), px(y + 304))]
        c.outlined("polygon", [arm], STEEL, line=4)
        for k in range(3):
            ty = y + 260 + k * 14
            tx = x + side * (40 + k * 3)
            c.d.rectangle(box(tx - 9, ty, tx + 9, ty + 6), fill=STEEL_DARK)
    c.d.line([(px(x - 14), px(y + 80)), (px(x - 38), px(y + 280))], fill=(240, 244, 248, 255), width=px(3))


def whisk(c, x, y):
    c.outlined("rounded_rectangle", [box(x - 12, y + 30, x + 12, y + 150), px(10)], (226, 92, 62, 255))
    for k, wdt in enumerate((70, 50, 30, 12)):
        c.d.ellipse(box(x - wdt / 2 - 3, y + 140, x + wdt / 2 + 3, y + 330), outline=INK, width=px(7))
        c.d.ellipse(box(x - wdt / 2, y + 143, x + wdt / 2, y + 327), outline=STEEL, width=px(3))
    c.d.rectangle(box(x - 14, y + 140, x + 14, y + 156), fill=STEEL_DARK)


def utensil_rail(c, night):
    rx0, rx1, ry = 470, 1050, 590
    c.outlined("rounded_rectangle", [box(rx0, ry - 9, rx1, ry + 9), px(9)], (212, 170, 84, 255))
    for x in (rx0 + 6, rx1 - 6):
        c.outlined("ellipse", [box(x - 16, ry - 16, x + 16, ry + 16)], (180, 136, 60, 255))
    items = ((540, spatula), (640, ladle), (770, saucepan), (895, tongs), (985, whisk))
    for x, draw in items:
        hook(c, x, ry - 6)
        draw(c, x, ry - 4)
    c.d.rectangle(box(rx0 + 20, ry - 5, rx1 - 20, ry - 2), fill=(255, 236, 170, 255))


def counter(c, night):
    top = (196, 136, 84) if not night else (120, 82, 60)
    c.d.rectangle(box(0, 1250, W, 1300), fill=INK)
    c.img.paste(Image.fromarray(vgrad(W * S, px(42), (226, 170, 112) if not night else (140, 98, 72), top).astype("uint8"), "RGB"), (0, px(1252)))
    c.d = ImageDraw.Draw(c.img)
    # cabinets
    base = (150, 98, 60) if not night else (80, 56, 46)
    c.d.rectangle(box(0, 1300, W, H), fill=base + (255,))
    for x0 in range(20, W, 270):
        c.outlined("rounded_rectangle", [box(x0, 1330, x0 + 240, 1700), px(14)], tuple(int(v * 1.12) for v in base) + (255,), line=4)
        c.d.rounded_rectangle(box(x0 + 26, 1360, x0 + 214, 1670), px(10), outline=tuple(int(v * 0.8) for v in base) + (255,), width=px(5))
        c.outlined("ellipse", [box(x0 + 196, 1500, x0 + 216, 1520)], (212, 170, 84, 255), line=3)
    # things on the counter
    c.outlined("rounded_rectangle", [box(560, 1200, 820, 1262), px(16)], (222, 176, 120, 255))   # cutting board
    c.d.ellipse(box(590, 1186, 680, 1240), fill=INK)
    c.d.ellipse(box(594, 1190, 676, 1236), fill=(229, 70, 60, 255))                            # tomato
    c.d.ellipse(box(624, 1176, 642, 1194), fill=(80, 160, 80, 255))
    c.outlined("rounded_rectangle", [box(700, 1180, 800, 1236), px(22)], (226, 170, 100, 255))  # bread
    for k in range(3):
        c.d.line([(px(720 + k * 26), px(1190)), (px(736 + k * 26), px(1228))], fill=(170, 112, 60, 255), width=px(4))
    # a pot with steam on the right
    c.outlined("rounded_rectangle", [box(860, 1120, 1020, 1252), px(26)], (90, 96, 110, 255))
    c.outlined("rounded_rectangle", [box(850, 1104, 1030, 1132), px(12)], (110, 118, 132, 255))
    c.outlined("rounded_rectangle", [box(926, 1086, 954, 1106), px(8)], (60, 64, 76, 255), line=4)
    # a bowl of eggs on the left
    c.outlined("polygon", [[(px(150), px(1200)), (px(330), px(1200)), (px(300), px(1256)), (px(180), px(1256))]], (110, 160, 200, 255))
    for ex in (190, 240, 290):
        c.outlined("ellipse", [box(ex - 24, 1160, ex + 24, 1214)], (255, 246, 228, 255), line=4)
    c.d.rectangle(box(140, 1194, 340, 1206), fill=(110, 160, 200, 255))


def steam(c):
    layer = Image.new("RGBA", c.img.size)
    d = ImageDraw.Draw(layer)
    for k, cx in enumerate((910, 950, 990)):
        pts = [(px(cx + 18 * math.sin(t / 14 + k)), px(1080 - t * 2.2)) for t in range(0, 90, 6)]
        d.line(pts, fill=(255, 255, 255, 120), width=px(10), joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(px(4)))
    c.img.alpha_composite(layer)
    c.d = ImageDraw.Draw(c.img)


def shadows(c):
    """Soft shadow under the shelf, the rail and along the counter edge."""
    layer = Image.new("RGBA", c.img.size)
    d = ImageDraw.Draw(layer)
    d.rectangle(box(480, 462, 1040, 490), fill=(0, 0, 0, 50))
    d.rectangle(box(0, 1300, W, 1330), fill=(0, 0, 0, 90))
    layer = layer.filter(ImageFilter.GaussianBlur(px(10)))
    c.img.alpha_composite(layer)
    c.d = ImageDraw.Draw(c.img)


def grade_night(c):
    a = np.asarray(c.img).astype(float)
    a[..., :3] *= np.array([0.72, 0.7, 0.86])
    c.img = Image.fromarray(np.clip(a, 0, 255).astype("uint8"), "RGBA")
    c.d = ImageDraw.Draw(c.img)


def paint(night):
    c = Canvas()
    wall(c, night)
    shadows(c)
    window(c, night)
    shelf(c, night)
    utensil_rail(c, night)
    counter(c, night)
    lamps(c, night)
    if night:
        grade_night(c)
        # the window keeps its moonlight, the lamps their warmth
    lamp_light(c, night)
    steam(c)
    return c.img.resize((W, H), Image.LANCZOS).convert("RGB")


def main():
    for name, night in (("scene_day", False), ("scene_night", True)):
        for old in OUT.glob(f"{name}.*"):
            old.unlink()
        img = paint(night)
        img.save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
        print("✓", (OUT / f"{name}.jpg").relative_to(ROOT), f"{(OUT / f'{name}.jpg').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

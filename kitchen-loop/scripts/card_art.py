"""Card illustrations (Daniel: every card's art must match its name, nothing cut off).

Dev tool, not part of the game: `python3 scripts/card_art.py [card_id ...]` (needs Pillow + numpy).
Each card gets a themed backdrop and its own subject, built from the game's sprites plus small props drawn here
in the same pixel art (4 px blocks with a dark outline). Outputs:
  src/assets/sprites/cards/bg_<theme>.png   backdrops, shared by several cards
  src/assets/sprites/cards/<card id>.png    the subject on a transparent canvas (the album's silhouette uses it)
  src/assets/cardBackdrops.json             each card's backdrop (null: the art is a full scene)
The six cards that assets/ref/cards_ref.jpg already illustrates use that art as a full scene (<card id>.jpg).
Text never goes into the art (it could not be translated): only numbers and symbols.
"""
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / "src" / "assets" / "sprites"
OUT = SPRITES / "cards"
REF_CARDS = ROOT / "assets" / "ref" / "cards_ref.jpg"

W, H = 240, 280  # the card's art box ratio; the essentials stay inside the middle 240 × 240
P = 4  # pixel-art block of faces and backdrops
Q = 6  # pixel-art block of the props
LINE = 3  # outline width, as in the sprites
GW, GH = W // P, H // P

PAL = {
    "k": (59, 42, 32), "w": (255, 255, 255), "c": (255, 243, 214), "t": (222, 184, 135), "T": (184, 138, 92),
    "y": (255, 213, 79), "Y": (255, 236, 150), "o": (245, 150, 30), "O": (200, 110, 20), "r": (229, 57, 53),
    "R": (160, 30, 35), "p": (244, 143, 177), "P": (236, 64, 122), "b": (100, 181, 246), "B": (40, 90, 170),
    "l": (190, 232, 255), "g": (102, 187, 106), "G": (46, 125, 50), "n": (141, 94, 60), "N": (93, 64, 40),
    "s": (214, 222, 228), "S": (140, 158, 170), "d": (90, 100, 110), "v": (171, 71, 188), "V": (106, 27, 154),
    "z": (255, 255, 255), "e": (205, 212, 222, 220), "E": (255, 255, 255, 110), "m": (120, 120, 120, 160),
    "q": (40, 40, 48), "x": (0, 0, 0, 0),
}
OUTLINE = PAL["k"] + (255,)


def rgba(c):
    return c if len(c) == 4 else c + (255,)


# ---------------------------------------------------------------- sprites

_cache = {}


def sprite(key):
    if key not in _cache:
        path = SPRITES / f"{key}.png"
        if not path.exists():
            path = ROOT / "assets" / f"pan_{key.split('/')[1]}.png"
        img = Image.open(path).convert("RGBA")
        _cache[key] = img.crop(img.getbbox())
    return _cache[key].copy()


def tint(img, fn):
    a = np.asarray(img).astype(float)
    rgb = fn(a[..., :3])
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype("uint8"), "RGBA")


def golden(img):
    def fn(rgb):
        lum = (rgb @ np.array([0.3, 0.59, 0.11]))[..., None] / 255
        dark, mid, light = np.array([120, 70, 10]), np.array([235, 170, 40]), np.array([255, 240, 150])
        return np.where(lum < 0.5, dark + (mid - dark) * (lum / 0.5), mid + (light - mid) * ((lum - 0.5) / 0.5))

    return tint(img, fn)


def darken(img, k):
    return tint(img, lambda rgb: rgb * k)


def bluish(img, k=0.75):
    return tint(img, lambda rgb: rgb * np.array([k * 0.85, k * 0.9, k * 1.15]))


class Card:
    """Canvas for one card's subject. `last` is the box of the last thing placed, for faces and props."""

    def __init__(self):
        self.img = Image.new("RGBA", (W, H))
        self.last = (0, 0, W, H)

    def put(self, key, h=None, w=None, x=W / 2, y=H / 2, rot=0, flip=False, fx=None, alpha=1.0, img=None):
        art = img if img is not None else sprite(key)
        if fx:
            art = fx(art)
        if flip:
            art = art.transpose(Image.FLIP_LEFT_RIGHT)
        scale = h / art.height if h else w / art.width
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.LANCZOS)
        if rot:
            art = art.rotate(rot, Image.BICUBIC, expand=True)
        if alpha < 1:
            a = np.asarray(art).copy()
            a[..., 3] = (a[..., 3] * alpha).astype("uint8")
            art = Image.fromarray(a, "RGBA")
        left, top = round(x - art.width / 2), round(y - art.height / 2)
        self.img.alpha_composite(art, (left, top)) if left >= 0 and top >= 0 else self._paste(art, left, top)
        self.last = (left, top, left + art.width, top + art.height)
        return self

    def _paste(self, art, left, top):
        layer = Image.new("RGBA", (W, H))
        layer.paste(art, (left, top), art)
        self.img.alpha_composite(layer)

    def at(self, fx, fy):
        x0, y0, x1, y1 = self.last
        return x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy

    def pat(self, rows, x, y, outline=True, p=Q, rot=0, flip=False, recolor=None):
        art = pattern(rows, outline, p, recolor)
        if flip:
            art = art.transpose(Image.FLIP_LEFT_RIGHT)
        if rot:
            art = art.rotate(rot, Image.NEAREST, expand=True)
        left, top = round(x - art.width / 2), round(y - art.height / 2)
        self._paste(art, left, top)
        return self

    def layer(self, art, x, y):
        self._paste(art, round(x - art.width / 2), round(y - art.height / 2))
        return self


def pattern(rows, outline=True, p=P, recolor=None):
    """Pixel art from rows of palette keys ('.' = empty), in p px blocks, with a 3 px dark outline like the sprites."""
    if isinstance(rows, str):
        rows = rows.strip("\n").split("\n")
    pad = LINE if outline else 0
    gw, gh = max(len(r) for r in rows), len(rows)
    img = Image.new("RGBA", (gw * p + 2 * pad, gh * p + 2 * pad))
    d = ImageDraw.Draw(img)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in ". ":
                continue
            ch = (recolor or {}).get(ch, ch)
            x, y = pad + i * p, pad + j * p
            d.rectangle((x, y, x + p - 1, y + p - 1), fill=rgba(PAL[ch]))
    return with_outline(img) if outline else img


def with_outline(img, width=None):
    width = width or LINE
    alpha = img.getchannel("A").point(lambda a: 255 if a > 200 else 0)
    ring = alpha.filter(ImageFilter.MaxFilter(2 * width + 1))
    out = Image.new("RGBA", img.size, OUTLINE)
    out.putalpha(ring)
    out.alpha_composite(img)
    return out


def shape(fn, gw, gh, color_fn, outline=True, p=P):
    """A procedural pixel shape: fn(u, v) → inside?, with u, v in [-1, 1]; color_fn(u, v) → colour key."""
    rows = []
    for j in range(gh):
        v = (j + 0.5) / gh * 2 - 1
        rows.append("".join(color_fn(u, v) if fn(u, v) else "." for u in [((i + 0.5) / gw * 2 - 1) for i in range(gw)]))
    return pattern(rows, outline, p)


# ---------------------------------------------------------------- faces and small props

EYES = {
    "dot": ["wk", "kk"],
    "big": [".kk.", "kwkk", "kkkk", ".kk."],
    "happy": [".k.", "k.k"],
    "closed": ["kkk"],
    "side": ["kkk", ".kk"],
    "o": [".k.", "k.k", ".k."],
    "x": ["k.k", ".k.", "k.k"],
    "swirl": ["kkk", "k.k", "k.."],
    "star": [".y.", "yyy", ".y."],
    "wink": ["k.k", ".k."],
}
MOUTHS = {
    "smile": ["k...k", ".kkk."],
    "grin": ["kkkkk", "krrrk", ".kkk."],
    "sad": [".kkk.", "k...k"],
    "wavy": ["kk..k", "..kk."],
    "o": [".k.", "k.k", ".k."],
    "flat": ["kkk"],
    "small": [".k.", "k.k"],
    "shout": [".kkk.", "krrrk", "krrrk", ".kkk."],
    "grit": ["kkkkk", "kwkwk", "kkkkk"],
    "cat": ["k.k.k", ".k.k."],
}
BROWS = {
    "angry": (["k..", ".kk"], ["..k", "kk."]),
    "sad": ([".kk", "k.."], ["kk.", "..k"]),
    "up": (["kk."], [".kk"]),
}


def face(card, x, y, eyes="dot", mouth="smile", gap=6, brows=None, blush=True, p=P):
    """A kawaii face centred on (x, y): eyes `gap` blocks apart, mouth below, pink cheeks."""
    e = pattern(EYES[eyes], outline=False, p=p)
    m = pattern(MOUTHS[mouth], outline=False, p=p)
    dx = gap * p / 2
    card.layer(e, x - dx, y)
    card.layer(e.transpose(Image.FLIP_LEFT_RIGHT) if eyes in ("side",) else e, x + dx, y)
    if blush:
        cheek = pattern(["pp"], outline=False, p=p)
        card.layer(cheek, x - dx - p, y + 3 * p)
        card.layer(cheek, x + dx + p, y + 3 * p)
    card.layer(m, x, y + 3.5 * p)
    if brows:
        left, right = BROWS[brows]
        card.layer(pattern(left, outline=False, p=p), x - dx, y - 2.5 * p)
        card.layer(pattern(right, outline=False, p=p), x + dx, y - 2.5 * p)


PROPS = {
    "tear": [".b.", "bbb", "blb", ".b."],
    "sweat": [".l.", "lll", "lwl", ".l."],
    "heart": [".pp.pp.", "pwpppPp", "pppppPp", ".pppPp.", "..pPp..", "...p..."],
    "red_heart": [".rr.rr.", "rwrrrRr", "rrrrrRr", ".rrrRr.", "..rRr..", "...r..."],
    "sparkle": ["...y...", "...y...", "..yYy..", "yyYzYyy", "..yYy..", "...y...", "...y..."],
    "star": ["...y...", "..yyy..", "yyyYyyy", ".yyyyy.", "..yyy..", ".yy.yy.", "yy...yy"],
    "note": ["..kkkk", "..k..k", "..k..k", "kkk.kkk", "kkk.kkk"],
    "z": ["zzzz", "..z.", ".z..", "zzzz"],
    "question": [".yyy.", "yy.yy", "...yy", "..yy.", "..y..", ".....", "..y.."],
    "exclaim": ["yy", "yy", "yy", "yy", "..", "yy"],
    "coin": [".yyy.", "yYyyO", "yyYyO", "yyyyO", ".OOO."],
    "crown": ["y...y...y", "yy.yyy.yy", "yyyyyyyyy", "yyryyybyy", "OOOOOOOOO"],
    "crumb": ["tT", "TT"],
    "drop_oil": [".y.", "yYy", "yyo", ".o."],
    "check": ["......g", ".....gg", "g...gg.", "gg.gg..", ".ggg...", "..g...."],
    "chili": ["..G", ".r.", "rr.", "rr.", ".r."],
}


def steam(card, x, y, n=3, spread=16, length=7, rng=None, alpha="e"):
    rng = rng or random.Random(int(x * 7 + y))
    for i in range(n):
        rows = []
        phase = rng.random() * 6
        for j in range(length):
            off = round(math.sin(phase + j * 0.9))
            rows.append("." * (1 + off) + alpha + "." * (1 - off))
        card.pat(rows, x + (i - (n - 1) / 2) * spread, y - length * P / 2, outline=False)


def motion(card, x, y, n=3, length=6, gap=4, color="S"):
    for i in range(n):
        card.pat([color * (length - (i % 2) * 2)], x - (i % 2) * P, y + i * gap * P, outline=False)


def confetti(card, rng, n=24, box=(10, 10, W - 10, 110), colors="rybgpv"):
    for _ in range(n):
        x, y = rng.randrange(box[0], box[2]), rng.randrange(box[1], box[3])
        card.pat([rng.choice(colors) * rng.choice((1, 2))], x, y, outline=False)


def twinkles(card, rng, n=8, box=(12, 12, W - 12, H - 12), avoid=None, prop="sparkle"):
    placed = 0
    while placed < n:
        x, y = rng.randrange(box[0], box[2]), rng.randrange(box[1], box[3])
        if avoid and avoid[0] < x < avoid[2] and avoid[1] < y < avoid[3]:
            continue
        card.pat(PROPS[prop], x, y, outline=False, p=rng.choice((2, 3)))
        placed += 1


def speech(card, x, y, gw=11, gh=7, flip=False):
    rows = ["." + "w" * (gw - 2) + "."] + ["w" * gw] * (gh - 2) + ["." + "w" * (gw - 2) + "."]
    rows += [("..ww" if not flip else "ww..").rjust(gw, ".") if flip else "..ww" + "." * (gw - 4), "..w" + "." * (gw - 3)]
    if flip:
        rows[-2] = "." * (gw - 4) + "ww.."
        rows[-1] = "." * (gw - 3) + "w.."
    card.pat(rows, x, y)


DIGITS = {
    "0": ["www", "w.w", "w.w", "w.w", "www"], "1": [".w.", "ww.", ".w.", ".w.", "www"],
    "2": ["www", "..w", "www", "w..", "www"], "3": ["www", "..w", ".ww", "..w", "www"],
    "x": ["...", "w.w", ".w.", "w.w", "..."], "4": ["w.w", "w.w", "www", "..w", "..w"],
    "5": ["www", "w..", "www", "..w", "www"], "8": ["www", "w.w", "www", "w.w", "www"],
}


def chalk(card, text, x, y, p=P, color="w"):
    rows = ["", "", "", "", ""]
    for ch in text:
        for j in range(5):
            rows[j] += DIGITS[ch][j].replace("w", color) + "."
    card.pat(rows, x, y, outline=False, p=p)


# ---------------------------------------------------------------- bigger drawn props

def egg_shape(gw=10, gh=13, ramp=("w", "c", "t"), p=6):
    def inside(u, v):
        k = 1 + 0.25 * v  # wider at the bottom
        return (u / (0.95 * min(1, 0.8 + 0.2 * (v + 1)))) ** 2 + v**2 < 1 and abs(u) < k

    def color(u, v):
        if (u + 0.35) ** 2 + (v + 0.45) ** 2 < 0.06:
            return "z"
        return ramp[0] if u + v < -0.1 else ramp[1] if u + v < 0.7 else ramp[2]

    return shape(inside, gw, gh, color, p=p)


def ring_shape(gw=14, gh=10, batter=("Y", "y", "o"), p=6):
    def inside(u, v):
        r = u * u + v * v
        return 0.28 < r < 1

    def color(u, v):
        return batter[0] if u + v < -0.6 else batter[2] if u + v > 0.6 else batter[1]

    return shape(inside, gw, gh, color, p=p)


def heart_shape(gw=17, gh=15, ramp=("p", "P", "R")):
    def inside(u, v):
        x, y = u * 1.25, -v * 1.25 + 0.25
        return (x * x + y * y - 1) ** 3 - x * x * y**3 < 0

    def color(u, v):
        if (u + 0.45) ** 2 + (v + 0.35) ** 2 < 0.04:
            return "z"
        return ramp[0] if u + v < 0 else ramp[1] if u + v < 0.8 else ramp[2]

    return shape(inside, gw, gh, color)


def cloche(gw=20, gh=13, p=7):
    def inside(u, v):
        return (v > 0.72) or (u * u / 0.8 + (v - 0.7) ** 2 / 1.6 < 1 and v < 0.72)

    def color(u, v):
        if v > 0.72:
            return "S"
        if -0.55 < u < -0.3 and -0.2 < v < 0.4:
            return "z"
        return "s" if u < 0.35 else "S"

    img = shape(inside, gw, gh, color, p=p)
    knob = pattern(["ss", "SS"], p=p)
    out = Image.new("RGBA", (img.width, img.height + knob.height - P))
    out.alpha_composite(knob, ((out.width - knob.width) // 2, 0))
    out.alpha_composite(img, (0, knob.height - p - 2 * LINE))
    return out


def bubble_helmet(gw=30, gh=30):
    def inside(u, v):
        return u * u + v * v < 1

    def color(u, v):
        r = u * u + v * v
        if r > 0.82:
            return "s"
        if (u + 0.45) ** 2 + (v + 0.5) ** 2 < 0.03 or (u + 0.6) ** 2 + (v + 0.2) ** 2 < 0.01:
            return "z"
        return "E"

    return shape(inside, gw, gh, color, outline=True)


def rainbow(gw=40, gh=21):
    bands = "rRoyYgbBvV"
    bands = "royglbv"

    def inside(u, v):
        r = math.hypot(u, (v - 1) * 1.9 / 2)
        return 0.5 < r < 1 and v < 1

    def color(u, v):
        r = math.hypot(u, (v - 1) * 1.9 / 2)
        return bands[min(len(bands) - 1, int((1 - r) / 0.5 * len(bands)))]

    return shape(inside, gw, gh, color)


def seal():
    """A red wax seal with a pan pressed into it."""
    return [
        "....rrrrrr....", "..rrrrrrrrrr..", ".rrRRRRRRRRrr.", ".rRrrrrrrrrRr.", "rrRrRRRrrrrRrr", "rRrRrrrRrrrrRr",
        "rRrRrrrRRRRrRr", "rRrRrrrRrrrrRr", "rrRrRRRrrrrRrr", ".rRrrrrrrrrRr.", ".rrRRRRRRRRrr.", "..rrrrrrrrrr..",
        "....rrrrrr....",
    ]


def sandwich(card, x, bottom):
    """A very tall sandwich: bun, lettuce, tomato, cheese, bacon, bread, lettuce, egg, bacon, bread; a toothpick on top."""
    rows = [
        ".........kk.........", ".........kk.........", "....ttttttttttttt...", "..tYtttYtttttYtttt..", ".ttttttttttttttttTT.",
        "tttttttttttttttttTTT", "gGggGgggGggggGgggGgg", ".g.gg.g.ggg.gg.g.gg.", "rrrrrrr.rrrrrrr.rrrr", "rRRrrrr.rRRrrrr.rRRr",
        "yyyyyyyyyyyyyyyyyyyy", ".yyy..yyy...yyyy..y.", "pPpppPpppPppppPpppPp", "PpPPPpPPPpPPPPpPPPpP", "tttttttttttttttttttt",
        "TTTTTTTTTTTTTTTTTTTT", "gGggGgggGggggGgggGgg", "wwwwwwwyyyywwwwwwwww", "wwwwwwyyyyyywwwwwwww", "pPpppPpppPppppPpppPp",
        "PpPPPpPPPpPPPPpPPPpP", "tttttttttttttttttttt", "TTTTTTTTTTTTTTTTTTTT", ".TTTTTTTTTTTTTTTTTT.",
    ]
    art = pattern(rows, p=7)
    card.layer(art, x, bottom - art.height / 2)
    card.last = (x - art.width / 2, bottom - art.height, x + art.width / 2, bottom)


def pan(card, x, y, w=120, rot=0, key="pans/default", flip=False):
    card.put(key, w=w, x=x, y=y, rot=rot, flip=flip)


# ---------------------------------------------------------------- backdrops (60 × 70 blocks)

def grid_bg(fn):
    img = Image.new("RGBA", (GW, GH))
    px = img.load()
    for j in range(GH):
        for i in range(GW):
            px[i, j] = rgba(fn(i, j))
    return img.resize((W, H), Image.NEAREST)


def mix(a, b, t):
    return tuple(round(a[k] + (b[k] - a[k]) * t) for k in range(3))


def noise(i, j, seed=1):
    return ((i * 73856093) ^ (j * 19349663) ^ (seed * 83492791)) % 1000 / 1000


def counter_fn(wall=(250, 236, 214), grout=(232, 212, 186), top=46, wood=((196, 136, 84), (170, 112, 66), (120, 78, 46))):
    def fn(i, j):
        if j < top:
            tile = (i % 8 == 0) or (j % 8 == 0)
            return grout if tile else mix(wall, (255, 255, 255), 0.15 * (1 - j / top))
        if j == top:
            return wood[2]
        if j < top + 3:
            return mix(wood[0], (255, 220, 170), 0.25)
        plank = (j - top) % 7 == 0 or (i + (j - top) // 7 * 13) % 23 == 0
        return wood[2] if plank else wood[1] if noise(i, j) < 0.12 else wood[0]

    return fn


def window_fn(sky_fn, wall=(250, 236, 214), frame=(160, 110, 70), box=(14, 6, 46, 38), top=46, extra=None):
    base = counter_fn(wall=wall, grout=mix(wall, (0, 0, 0), 0.08), top=top)

    def fn(i, j):
        x0, y0, x1, y1 = box
        if x0 <= i <= x1 and y0 <= j <= y1:
            if i in (x0, x1, (x0 + x1) // 2) or j in (y0, y1, (y0 + y1) // 2):
                return frame
            c = sky_fn(i - x0, j - y0, x1 - x0, y1 - y0)
            return c
        if extra:
            e = extra(i, j)
            if e:
                return e
        return base(i, j)

    return fn


def night_sky(i, j, w, h):
    sky = mix((20, 24, 64), (60, 50, 110), j / h)
    if noise(i, j, 5) < 0.04:
        return (255, 244, 200)
    if (i - w * 0.72) ** 2 + (j - h * 0.3) ** 2 < 16 and not (i - w * 0.78) ** 2 + (j - h * 0.25) ** 2 < 12:
        return (255, 236, 160)
    return sky


def dawn_sky(i, j, w, h):
    if (i - w * 0.5) ** 2 + (j - h * 0.95) ** 2 < 40:
        return (255, 214, 102)
    return mix((255, 190, 120), (255, 130, 140), j / h) if j > h * 0.4 else mix((140, 180, 240), (255, 190, 120), j / (h * 0.4))


def rain_sky(i, j, w, h):
    if (i * 3 + j * 2) % 11 == 0 and noise(i, j, 3) < 0.5:
        return (200, 220, 240)
    return mix((110, 130, 160), (150, 165, 190), j / h)


def rays_fn(colors, center=(30, 32), n=16, spin=0.0, glow=None):
    def fn(i, j):
        a = math.atan2(j - center[1], i - center[0]) + spin
        k = int((a + math.pi) / (2 * math.pi) * n) % 2
        d = math.hypot(i - center[0], j - center[1])
        base = colors[k]
        if glow and d < glow[0]:
            return mix(glow[1], base, d / glow[0])
        return mix(base, colors[2], min(1, d / 60))

    return fn


def dining_fn(i, j):
    if j >= 50:  # checkered tablecloth
        if j == 50:
            return (150, 40, 40)
        return (230, 70, 70) if ((i // 3) + ((j - 51) // 3)) % 2 == 0 else (255, 246, 236)
    if j >= 30:  # wainscot
        return (150, 98, 58) if i % 10 in (0, 9) or j in (30, 31) else (176, 120, 74)
    if 6 <= j <= 20 and 40 <= i <= 54:  # little framed picture
        if i in (40, 54) or j in (6, 20):
            return (190, 140, 60)
        return (150, 200, 150) if j > 14 else (170, 210, 245)
    return (236, 214, 176) if (i // 4) % 2 == 0 else (228, 204, 164)


def pantry_fn(i, j):
    wall = (118, 84, 58) if (i // 2 + j // 6) % 2 else (128, 92, 62)
    for shelf in (20, 44):
        if j == shelf or j == shelf + 1:
            return (80, 54, 36) if j == shelf + 1 else (170, 120, 80)
        if shelf - 10 <= j < shelf:  # jars and sacks on the shelf
            slot = i % 12
            if 1 <= slot <= 6 and j >= shelf - (8 if (i // 12) % 2 else 6):
                colors = [(200, 220, 230), (230, 180, 90), (180, 210, 150), (240, 200, 200)]
                c = colors[(i // 12 + shelf) % 4]
                return mix(c, (255, 255, 255), 0.3) if slot == 2 else c
            if 8 <= slot <= 10 and j >= shelf - 5:
                return (205, 170, 120)
    if j >= 58:
        return (150, 100, 60) if (i + j) % 9 else (120, 80, 50)
    return wall


def garden_fn(i, j):
    if j > 56:
        return (96, 170, 80) if noise(i, j) > 0.2 else (70, 140, 60)
    leaf = noise(i // 3, j // 3, 9)
    base = mix((200, 235, 180), (150, 210, 140), j / 56)
    if leaf < 0.18:
        return mix(base, (90, 160, 90), 0.5)
    return base


def sea_fn(i, j):
    if j < 34:
        if (i - 46) ** 2 + (j - 10) ** 2 < 20:
            return (255, 230, 120)
        return mix((130, 200, 250), (200, 235, 255), j / 34)
    wave = (j + int(2 * math.sin(i / 3))) % 5 == 0
    return (220, 240, 255) if wave else mix((60, 150, 220), (30, 90, 170), (j - 34) / 36)


def space_fn(i, j):
    if noise(i, j, 7) < 0.035:
        return (255, 250, 220)
    if (i - 48) ** 2 + (j - 12) ** 2 < 30:
        return (240, 140, 90) if (j + i // 3) % 3 else (255, 180, 120)
    return mix((24, 16, 60), (70, 30, 100), j / GH)


def hearts_fn(i, j):
    small = [".x.x.", "xxxxx", ".xxx.", "..x.."]
    ci, cj = i % 10, j % 10
    shift = (j // 10) % 2 * 5
    ci = (i + shift) % 10
    if 2 <= ci < 7 and 3 <= cj < 7 and small[cj - 3][ci - 2] == "x":
        return (255, 170, 200)
    return mix((255, 225, 235), (255, 200, 220), j / GH)


def stage_fn(i, j):
    base = mix((60, 30, 110), (30, 16, 60), j / GH)
    for cx, color in ((10, (255, 120, 200)), (30, (120, 220, 255)), (50, (255, 230, 120))):
        spread = (j + 4) * 0.28
        if abs(i - cx) < spread and noise(i, j, cx) < 0.9:
            base = mix(base, color, 0.28)
    if j > 58:
        return (90, 50, 150) if (i // 4 + j // 4) % 2 else (130, 80, 190)
    if noise(i, j, 2) < 0.02:
        return (255, 255, 255)
    return base


def magic_fn(i, j):
    d = math.hypot(i - 30, j - 36)
    base = mix((120, 70, 180), (30, 16, 60), min(1, d / 40))
    if noise(i, j, 11) < 0.03:
        return (230, 200, 255)
    return base


def chalk_fn(i, j):
    if i < 3 or i > GW - 4 or j < 3 or j > GH - 4:
        return (150, 100, 60) if (i + j) % 5 else (120, 80, 50)
    if noise(i, j, 4) < 0.05:
        return (80, 110, 90)
    return (46, 74, 60)


def fridge_fn(i, j):
    if j >= 60:
        return (190, 150, 110) if (i // 6 + j // 6) % 2 else (170, 132, 96)
    if j == 20:
        return (170, 190, 190)
    if 50 <= i <= 52 and (4 <= j <= 16 or 26 <= j <= 50):
        return (150, 165, 170)
    return mix((220, 244, 240), (196, 226, 222), i / GW)


def brulee_fn(i, j):
    row = j // 5
    brick = (i + (row % 2) * 4) % 8 == 0 or j % 5 == 0
    base = (70, 56, 62) if brick else (96, 80, 88)
    d = math.hypot(i - 30, j - 20)
    base = mix((255, 190, 110), base, min(1, d / 26)) if d < 26 else base
    if j >= 52:
        return (110, 74, 48) if (j - 52) % 5 else (80, 54, 36)
    return base


def sun_fn(i, j):
    if j > 56:
        return (120, 170, 90) if (i + j) % 7 else (90, 140, 70)
    if (i - 30) ** 2 + (j - 26) ** 2 < 280:
        return (230, 70, 60)
    return mix((255, 244, 220), (250, 226, 196), j / 56)


def floor_fn(i, j):
    """Under the fridge: its bottom edge and a dark gap, then the kitchen floor."""
    if j < 30:
        return mix((220, 244, 240), (196, 226, 222), i / GW)
    if j < 33:
        return (60, 50, 50)
    return (200, 160, 120) if (i // 6 + j // 6) % 2 else (180, 140, 104)


BACKDROPS = {
    "counter": counter_fn(),
    "night": window_fn(night_sky, wall=(62, 66, 110), frame=(40, 36, 60)),
    "dawn": window_fn(dawn_sky),
    "rain": window_fn(rain_sky, wall=(214, 204, 196)),
    "dining": dining_fn,
    "pantry": pantry_fn,
    "garden": garden_fn,
    "sea": sea_fn,
    "space": space_fn,
    "fire": rays_fn(((255, 140, 40), (255, 90, 40), (180, 40, 30)), glow=(18, (255, 230, 140))),
    "gold": rays_fn(((255, 226, 130), (250, 200, 90), (200, 140, 40)), glow=(20, (255, 250, 220))),
    "hearts": hearts_fn,
    "stage": stage_fn,
    "magic": magic_fn,
    "chalk": chalk_fn,
    "fridge": fridge_fn,
    "brulee": brulee_fn,
    "sun": sun_fn,
    "floor": floor_fn,
}


# ---------------------------------------------------------------- the reference illustrations

REF_CROPS = {  # card: crop of its art in assets/ref/cards_ref.jpg (portrait, centred on the subject)
    "angry_vegan": (150, 144, 300, 318),
    "burnt_egg": (545, 144, 695, 318),
    "triple_bacon_master": (918, 144, 1068, 318),
    "bacon_dj": (176, 504, 326, 678),
    "golden_truffle": (540, 504, 690, 678),
    "exploding_tomato": (913, 504, 1063, 678),
}


def ref_scene(card_id):
    crop = Image.open(REF_CARDS).convert("RGBA").crop(REF_CROPS[card_id])
    return crop.resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------- the cards

def yolk_mask(a):
    return (a[..., 0] - a[..., 2] > 60) & (a[..., 1] < 240) & (a[..., 3] > 200)


def egg_yolk_centre():
    a = np.asarray(sprite("ingredients/egg")).astype(int)
    ys, xs = np.nonzero(yolk_mask(a))
    return xs.mean() / a.shape[1], ys.mean() / a.shape[0]


def double_yolk_egg():
    """The fried egg with its yolk moved aside and a second one next to it."""
    img = sprite("ingredients/egg")
    a = np.asarray(img).astype(int)
    mask = yolk_mask(a)
    ys, xs = np.nonzero(mask)
    ring = np.asarray(Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))) > 0
    box = (xs.min() - 5, ys.min() - 5, xs.max() + 6, ys.max() + 6)
    yolk = np.zeros_like(a)
    yolk[ring] = a[ring]
    yolk = Image.fromarray(yolk.astype("uint8"), "RGBA").crop(box)
    white = a.copy()
    white[ring & (a[..., 3] > 200)] = (252, 253, 235, 255)
    out = Image.fromarray(white.astype("uint8"), "RGBA")
    w = box[2] - box[0]
    out.alpha_composite(yolk, (box[0] - round(w * 0.42), box[1] + round(w * 0.12)))
    out.alpha_composite(yolk, (box[0] + round(w * 0.42), box[1] - round(w * 0.12)))
    return out


def C():
    return Card()


def put_face(card, key, fx, fy, **kw):  # key: what the face is on (for reading the card list)
    x, y = card.at(fx, fy)
    face(card, x, y, **kw)


INGREDIENT_FACE = {  # where a face sits on each ingredient sprite (fractions of its box)
    "tomato": (0.5, 0.58), "potato": (0.5, 0.5), "cheese": (0.6, 0.62), "mushroom": (0.5, 0.36), "onion": (0.5, 0.64),
    "bread": (0.5, 0.56), "bacon": (0.5, 0.5), "truffle": (0.5, 0.52), "herbs": (0.6, 0.3),
}


def ing(card, name, h, x=W / 2, y=H / 2 + 10, rot=0, flip=False, fx=None, face_kw=None, face_scale=None):
    card.put(f"ingredients/{name}", h=h, x=x, y=y, rot=rot, flip=flip, fx=fx)
    if face_kw is not None:
        if name == "egg":
            fxy = egg_yolk_centre()
            if flip:
                fxy = (1 - fxy[0], fxy[1])
        else:
            fxy = INGREDIENT_FACE[name]
        put_face(card, name, *fxy, p=face_scale or max(3, min(6, round(h / 26))), **face_kw)
    return card


def build_cards():
    R = random.Random
    cards = {}

    def card(card_id, bg):
        def wrap(fn):
            cards[card_id] = (bg, fn)
            return fn

        return wrap

    # ---- commons
    @card("dubious_toast", "counter")
    def _(c):
        c.put("ingredients/bread", h=150, y=160, fx=lambda im: tint(im, lambda rgb: rgb * 0.95 + np.array([10, 8, 0])))
        put_face(c, "bread", 0.5, 0.55, eyes="side", mouth="wavy", brows="up")
        c.pat(PROPS["question"], 190, 70)
        c.pat(PROPS["question"], 60, 84, p=4)

    @card("burnt_egg", None)
    def _(c):
        c.img = ref_scene("burnt_egg")

    @card("sad_tomato", "counter")
    def _(c):
        c.put("ingredients/bread", h=70, x=62, y=205, rot=8)
        ing(c, "tomato", 130, x=140, y=150, fx=lambda im: tint(im, lambda rgb: rgb * np.array([0.9, 0.92, 1.0])),
            face_kw=dict(eyes="dot", mouth="sad", brows="sad"))
        x, y = c.at(0.5, 0.58)
        c.pat(PROPS["tear"], x - 20, y + 22)
        c.pat(PROPS["tear"], x + 26, y + 34, p=4)

    @card("normal_bacon", "counter")
    def _(c):
        ing(c, "bacon", 150, y=150, face_kw=dict(eyes="dot", mouth="small"))

    @card("suspicious_potato", "pantry")
    def _(c):
        ing(c, "potato", 130, y=160, rot=-12, face_kw=dict(eyes="side", mouth="flat", brows="angry", blush=False))
        c.pat(PROPS["exclaim"], 196, 96)

    @card("lazy_cheese", "counter")
    def _(c):
        ing(c, "cheese", 120, y=180, rot=-80, face_kw=None)
        face(c, 118, 176, eyes="closed", mouth="small")
        c.pat(PROPS["z"], 170, 110, outline=False)
        c.pat(PROPS["z"], 196, 80, outline=False, p=4)
        c.pat(PROPS["z"], 214, 58, outline=False, p=3)

    @card("shy_mushroom", "counter")
    def _(c):
        ing(c, "mushroom", 110, x=150, y=140, rot=-10, face_kw=dict(eyes="closed", mouth="small"))
        c.put("ingredients/egg", h=110, x=110, y=196)
        c.pat(PROPS["heart"], 196, 86, p=4)

    @card("crying_onion", "counter")
    def _(c):
        ing(c, "onion", 150, y=150, face_kw=dict(eyes="closed", mouth="shout", brows="sad"))
        x, y = c.at(0.5, 0.64)
        for side in (-1, 1):
            for k in range(4):
                c.pat(["b"], x + side * 18, y + 12 + k * 8, outline=False)
            c.pat(PROPS["tear"], x + side * 34, y + 36)

    @card("lost_herbs", "garden")
    def _(c):
        c.put("dishes/fish_stew", w=110, x=70, y=214)
        ing(c, "herbs", 130, x=150, y=130, rot=-25, face_kw=dict(eyes="swirl", mouth="o", blush=False))
        c.pat(PROPS["question"], 60, 80)
        c.pat(PROPS["question"], 206, 196, p=4)

    @card("fish_out_of_water", "counter")
    def _(c):
        c.pat(["." + "l" * 26 + ".", "l" * 28, "." + "l" * 26 + "."], W / 2, 212, outline=False)
        c.put("ingredients/fish", w=190, y=176, rot=8)
        for x, y in ((60, 110), (186, 104), (206, 140)):
            c.pat(PROPS["sweat"], x, y)
        c.pat(PROPS["exclaim"], 120, 86)

    @card("dancing_bread", "stage")
    def _(c):
        ing(c, "bread", 104, x=78, y=170, rot=14, face_kw=dict(eyes="happy", mouth="grin"))
        ing(c, "bread", 104, x=164, y=150, rot=-14, face_kw=dict(eyes="happy", mouth="grin"))
        for x, y, p in ((40, 70, 4), (120, 60, 3), (206, 84, 4)):
            c.pat(PROPS["note"], x, y, outline=False, p=p, recolor={"k": "Y"})

    @card("double_yolk", "counter")
    def _(c):
        c.put("egg2", w=180, y=160, img=double_yolk_egg())
        c.pat(PROPS["sparkle"], 44, 84, outline=False)
        c.pat(PROPS["sparkle"], 200, 90, outline=False)

    @card("midnight_snack", "night")
    def _(c):
        c.put("dishes/bacon_sandwich", w=170, y=196, fx=lambda im: bluish(im, 0.85))
        c.pat(PROPS["z"], 196, 132, outline=False, p=4)

    @card("crispy_bacon", "counter")
    def _(c):
        c.put("dishes/triple_bacon", w=190, y=170)
        for x, y, r in ((40, 90, 0), (200, 86, 0), (120, 66, 0)):
            c.pat(["y.y", ".y.", "y.y"], x, y, outline=False)

    @card("happy_bravas", "dining")
    def _(c):
        c.put("dishes/bravas", w=190, y=176)
        c.pat(PROPS["heart"], 196, 76, p=4)
        c.pat(PROPS["heart"], 44, 92, p=4)

    @card("grandma_tortilla", "dining")
    def _(c):
        c.put("dishes/spanish_omelette", w=180, y=172)
        c.put("ingredients/onion", h=60, x=196, y=100)
        c.pat(PROPS["red_heart"], 50, 80, p=4)

    @card("lonely_salad", "dining")
    def _(c):
        c.put("dishes/garden_salad", w=110, x=W / 2, y=196)
        speech(c, 170, 118, gw=9, gh=5)
        c.pat(["k.k.k"], 170, 112, outline=False)

    @card("pip_apron", "counter")
    def _(c):
        c.put("pip/thumbs_up", h=220, y=150)
        rng = R(4)
        x0, y0, x1, y1 = c.last
        for colour in "roynrg":
            x = rng.uniform(x0 + (x1 - x0) * 0.4, x0 + (x1 - x0) * 0.62)
            y = rng.uniform(y0 + (y1 - y0) * 0.62, y0 + (y1 - y0) * 0.8)
            c.pat([".%s%s" % (colour, colour), colour * 3, "%s%s." % (colour, colour)], x, y, outline=False, p=5)

    @card("dented_pan", "counter")
    def _(c):
        pan(c, W / 2, 160, w=210, rot=20)
        x, y = c.at(0.36, 0.42)
        c.pat(["..zzz..", ".zSSSs.", "zSdddSs", "zSdqdSs", ".sSdSs.", "..sss.."], x, y, outline=False, p=6)
        for dx, dy in ((-40, -46), (30, -56), (-54, 4)):
            c.pat(["y.y", ".y.", "y.y"], x + dx, y + dy, outline=False)
        c.pat(PROPS["question"], 200, 80)

    @card("kitchen_clock", "counter")
    def _(c):
        c.put("decor/wall_clock", w=170, y=140)
        arrow = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(arrow)
        d.arc((22, 42, 218, 238), 20, 130, fill=rgba(PAL["b"]), width=10)
        d.polygon([(206, 150), (230, 128), (236, 162)], fill=rgba(PAL["b"]))
        c.img.alpha_composite(with_outline(arrow))

    @card("brave_egg", "counter")
    def _(c):
        c.pat(["rrrrrrrrrr", ".rrrrrrrr.", "..rrrrrr..", "..rrrrrr..", "...rrRr...", "...rRRr..."], 100, 170, p=6)
        ing(c, "egg", 150, x=128, y=150, rot=-6, face_kw=dict(eyes="dot", mouth="grin", brows="angry"))
        pan(c, 200, 234, w=110, rot=0)

    @card("rolling_potato", "counter")
    def _(c):
        ing(c, "potato", 120, x=150, y=170, rot=70, face_kw=None)
        face(c, 150, 166, eyes="swirl", mouth="o", blush=False)
        motion(c, 50, 140, n=4, length=8, gap=5)

    @card("twin_tomatoes", "counter")
    def _(c):
        ing(c, "tomato", 110, x=80, y=170, face_kw=dict(eyes="happy", mouth="smile"))
        ing(c, "tomato", 110, x=166, y=156, rot=10, face_kw=dict(eyes="x", mouth="wavy", blush=False))

    @card("cheese_moon", "night")
    def _(c):
        moon = shape(lambda u, v: u * u + v * v < 1, 17, 17,
                     lambda u, v: "o" if (u - 0.2) ** 2 + (v + 0.3) ** 2 < 0.05 or (u + 0.4) ** 2 + (v - 0.3) ** 2 < 0.07
                     or (u - 0.35) ** 2 + (v - 0.45) ** 2 < 0.03 else "y" if u + v < 0.6 else "o")
        c.layer(moon, 120, 92)
        c.last = (120 - moon.width / 2, 92 - moon.height / 2, 120 + moon.width / 2, 92 + moon.height / 2)
        put_face(c, "moon", 0.5, 0.5, eyes="closed", mouth="small")
        c.put("ingredients/cheese", h=64, x=190, y=210)

    @card("mushroom_umbrella", "rain")
    def _(c):
        ing(c, "mushroom", 180, y=150, face_kw=dict(eyes="dot", mouth="smile"))
        for x in (40, 70, 170, 200, 110):
            c.pat(["l", "l", "b"], x, 40 + (x % 3) * 12, outline=False)
        for x in (84, 150):
            c.pat(["tT", "TT"], x, 244)
            face(c, x + 1, 238, eyes="dot", mouth="small", gap=2, blush=False, p=2)

    @card("onion_rings", "counter")
    def _(c):
        for x, y in ((70, 214), (164, 214), (118, 170), (78, 124), (160, 128)):
            c.layer(ring_shape(), x, y)
        c.put("ingredients/onion", h=62, x=204, y=60)

    @card("herb_bouquet", "garden")
    def _(c):
        c.put("ingredients/herbs", h=150, x=100, y=150, rot=-18)
        c.put("ingredients/herbs", h=150, x=140, y=150, rot=18, flip=True)
        c.pat(["pp...pp", "pPp.pPp", ".ppPpp.", "..pPp..", ".pp.pp.", "pp...pp"], 120, 190)

    @card("jumping_fish", "counter")
    def _(c):
        pan(c, 160, 222, w=140)
        c.put("ingredients/fish", w=150, x=96, y=110, rot=-35)
        for k in range(5):
            c.pat(["S"], 150 + k * 10, 120 + k * 14, outline=False)
        for x, y in ((50, 180), (70, 196)):
            c.pat(PROPS["sweat"], x, y, p=4)

    @card("bacon_wave", "counter")
    def _(c):
        c.put("ingredients/bacon", h=100, x=90, y=130, rot=-12)
        c.put("ingredients/bacon", h=100, x=150, y=190, rot=12)
        for x, y in ((50, 70), (196, 100), (200, 230)):
            c.pat(PROPS["note"], x, y, outline=False, p=4)

    @card("perfect_toast", "counter")
    def _(c):
        c.put("dishes/tomato_toast", w=196, y=176)
        c.pat(PROPS["drop_oil"], 190, 70)
        c.pat(PROPS["sparkle"], 50, 80, outline=False)

    @card("house_toast", "counter")
    def _(c):
        c.put("dishes/special_toast", w=196, y=180)
        for name, x, y, h in (("cheese", 80, 150, 44), ("mushroom", 122, 140, 40), ("herbs", 164, 148, 44), ("egg", 120, 96, 60)):
            c.put(f"ingredients/{name}", h=h, x=x, y=y)
        c.pat(PROPS["question"], 206, 70, p=4)

    @card("sunday_scramble", "dawn")
    def _(c):
        c.put("dishes/cheesy_scramble", w=180, y=196)
        radio = ["......k.", ".....k..", "rrrrrrrr", "rsssRyyr", "rsSsRyyr", "rsssRRRr", "rrrrrrrr"]
        c.pat(radio, 190, 110)
        c.pat(PROPS["note"], 150, 80, outline=False, p=4)

    @card("forest_omelette", "garden")
    def _(c):
        c.put("dishes/mushroom_omelette", w=196, y=184)
        c.put("ingredients/mushroom", h=58, x=80, y=110, rot=-10)
        put_face(c, "mushroom", 0.5, 0.36, eyes="dot", mouth="o", gap=4, blush=False, p=3)
        c.put("ingredients/mushroom", h=46, x=170, y=104, rot=12)
        put_face(c, "mushroom", 0.5, 0.36, eyes="closed", mouth="small", gap=4, blush=False, p=3)

    @card("skewer_parade", "garden")
    def _(c):
        c.put("dishes/garden_skewer", w=200, y=170, rot=-8)
        flags = ["r", "y", "b", "g", "v", "p"]
        for k, col in enumerate(flags):
            c.pat([col * 3, "." + col + "."], 28 + k * 36, 40 + (k % 2) * 6, outline=False)
        c.pat(["k" * 55], W / 2, 34, outline=False, p=4)

    @card("sailor_lunch", "sea")
    def _(c):
        c.put("dishes/herb_fish", w=200, y=190)
        anchor = ["..s..", ".sSs.", "..s..", "sssss", "..s..", "s.s.s", ".sss."]
        c.pat(anchor, 200, 80)

    @card("warm_stew", "rain")
    def _(c):
        c.put("dishes/fish_stew", w=200, y=190)
        steam(c, 120, 110, n=3, spread=26, length=8)

    @card("the_classic", "dining")
    def _(c):
        c.put("dishes/bacon_egg", w=196, y=176)
        c.pat(PROPS["check"], 52, 70, p=7)

    @card("sandwich_tower", "counter")
    def _(c):
        sandwich(c, W / 2, 262)
        for x, y in ((34, 90), (206, 140)):
            c.pat(PROPS["sweat"], x, y)

    @card("pip_confused", "counter")
    def _(c):
        c.put("pip/confused", h=210, y=140)
        salt = [".sss.", "sSsSs", "wwwww", "wwwww", "wwwww", "wwwww"]
        c.pat(salt, 40, 230)
        c.pat(["wwww", "wzzw", "wwww"], 206, 236)

    @card("pip_winking", "counter")
    def _(c):
        c.put("pip/winking", h=220, y=146)
        bulb = [".yyy.", "yYYyy", "yYyyy", ".yyy.", ".sss.", ".SSS."]
        c.pat(bulb, 200, 60)

    @card("pip_worried", "counter")
    def _(c):
        c.put("pip/worried", h=210, y=150)
        c.put("decor/wall_clock", w=64, x=200, y=60)
        for x, y in ((50, 90), (40, 130)):
            c.pat(PROPS["sweat"], x, y)

    @card("regular_customer", "dining")
    def _(c):
        c.put("customers/calm_happy", h=200, y=130)
        c.put("dishes/tomato_toast", w=110, x=W / 2, y=234)

    @card("student_rush", "dining")
    def _(c):
        c.put("customers/student_arrive", h=210, x=140, y=140)
        motion(c, 36, 110, n=4, length=7, gap=6)
        c.put("ingredients/clock", h=56, x=206, y=232)

    @card("coffee_break", "dining")
    def _(c):
        c.put("customers/office_idle", h=200, y=130)
        cup = ["wwwwww..", "wnnnnw..", "wwwwwwww", "wwwwww.w", "wwwwwwww", ".wwww..."]
        c.pat(cup, W / 2, 236)
        steam(c, W / 2 - 6, 196, n=2, spread=14, length=5)

    @card("lost_tourist", "dining")
    def _(c):
        c.put("customers/tourist_idle", h=200, x=110, y=132)
        folded = ["tttcctttt", "tcrcctcct", "tcctrtcct", "tccttcrrt", "tttcctttt"]
        c.pat(folded, 170, 236, p=7)
        c.pat(PROPS["question"], 206, 60)

    @card("fallen_tip", "floor")
    def _(c):
        c.put("pip/thinking", h=160, x=78, y=190)
        c.pat(PROPS["coin"], 176, 136, p=7)
        c.pat(["q" * 60] * 3, W / 2, 126, outline=False)
        c.pat(PROPS["sparkle"], 206, 150, outline=False, p=4)
        for k in range(4):
            c.pat(["S"], 150 - k * 14, 184 + (k % 2) * 6, outline=False)

    @card("steam_cloud", "dawn")
    def _(c):
        c.put("vfx/smoke", w=190, y=100, fx=lambda im: tint(im, lambda rgb: rgb * 0.35 + 150))
        pan(c, W / 2, 222, w=150, key="ui/icon_cook")

    @card("fridge_note", "fridge")
    def _(c):
        note = ["....rr....", "...rRRr...", "yyyyyyyyyy", "yyyyyyyyyy", "yNNNNNNyyy", "yyyyyyyyyy", "yNNNNNNNNy",
                "yyyyyyyyyy", "yNNNNyyyyy", "yyyyyyyyyy", "yyyyyyyyyy", "yyyyyyyyyy"]
        c.pat(note, 110, 130, p=10, rot=-6)
        c.put("ingredients/cheese", h=50, x=140, y=190)
        c.pat(["rr.rr", ".rrr.", "rr.rr"], 142, 192, outline=False)

    @card("morning_kitchen", "dawn")
    def _(c):
        c.put("ingredients/bread", h=110, y=210)
        steam(c, W / 2, 140, n=3, spread=20, length=6)

    @card("potato_family", "pantry")
    def _(c):
        ing(c, "potato", 120, x=76, y=184, rot=-8, face_kw=dict(eyes="dot", mouth="smile"))
        x, y = c.at(0.5, 0.5)
        c.pat(["NNN.NNN", ".NNNNN."], x, y + 18, outline=False)
        ing(c, "potato", 100, x=170, y=190, rot=8, face_kw=dict(eyes="happy", mouth="smile"))
        x, y = c.at(0.3, 0.1)
        c.pat(["pp.pp", "ppPpp", "pp.pp"], x, y)
        ing(c, "potato", 60, x=124, y=238, face_kw=dict(eyes="dot", mouth="small", gap=4), face_scale=3)

    # ---- rares
    @card("angry_vegan", None)
    def _(c):
        c.img = ref_scene("angry_vegan")

    @card("bacon_dj", None)
    def _(c):
        c.img = ref_scene("bacon_dj")

    @card("samurai_tomato", "sun")
    def _(c):
        ing(c, "tomato", 150, y=160, face_kw=dict(eyes="dot", mouth="flat", brows="angry", blush=False))
        x0, y0, x1, y1 = c.last
        band_y = y0 + (y1 - y0) * 0.4
        cols = int((x1 - x0) * 0.86 / 5)
        c.pat(["r" * cols, "R" * cols], W / 2, band_y, p=5)
        c.pat(["rr..", ".rr.", "..rr", "..rr"], x1 - 2, band_y + 18, p=5)
        sword = ["kk" + "s" * 22 + "z", "nn" + "S" * 22 + "."]
        c.pat(sword, 76, 234, p=5, rot=30)

    @card("astronaut_egg", "space")
    def _(c):
        ing(c, "egg", 120, y=150, rot=-15, face_kw=dict(eyes="big", mouth="o"))
        c.layer(bubble_helmet(), W / 2, 150)
        c.pat(PROPS["star"], 40, 60, outline=False, p=4)
        c.pat(PROPS["star"], 204, 236, outline=False, p=4)

    @card("grumpy_grandma", "dining")
    def _(c):
        c.put("customers/calm_angry", h=200, y=130)
        for x in (90, 110):
            c.pat(PROPS["coin"], x, 240, p=6)

    @card("sleepy_pip", "night")
    def _(c):
        c.put("pip/sleeping", h=200, y=160)
        for x, y, p in ((170, 90, 4), (196, 66, 3), (214, 46, 2)):
            c.pat(PROPS["z"], x, y, outline=False, p=p)

    @card("alien_tourist", "space")
    def _(c):
        c.put("customers/tourist", h=210, y=150)
        c.put("dishes/tomato_toast", w=80, x=196, y=230)

    @card("champions_breakfast", "dining")
    def _(c):
        c.put("dishes/full_breakfast", w=200, y=176)
        medal = ["b...b", "bb.bb", ".bbb.", ".yyy.", "yyYyy", "yyyyy", ".yyy."]
        c.pat(medal, 44, 70, p=8)

    @card("batter_king", "counter")
    def _(c):
        c.put("dishes/fish_chips", w=200, y=180)
        c.pat(PROPS["crown"], 96, 112, p=6, rot=-12)

    @card("kitchen_in_love", "hearts")
    def _(c):
        c.put("dishes/bacon_egg", w=180, y=190)
        for x, y, p in ((70, 80, 4), (130, 56, 5), (190, 90, 3)):
            c.pat(PROPS["red_heart"], x, y, p=p)

    @card("midnight_kitchen", "night")
    def _(c):
        pan(c, 64, 216, w=104, rot=0, flip=True)
        put_face(c, "pan", 0.62, 0.5, eyes="happy", mouth="grin", p=5)
        pan(c, 176, 216, w=104)
        put_face(c, "pan", 0.38, 0.5, eyes="dot", mouth="o", p=5)
        speech(c, 120, 130, gw=13, gh=8)
        c.pat(PROPS["star"], 104, 118, outline=False, p=4)
        c.pat(["..yy", ".y..", ".y..", "..yy"], 138, 118, outline=False, p=5)

    @card("party_pip", "stage")
    def _(c):
        c.put("pip/celebrating", h=220, y=156)
        confetti(c, R(62))
        c.pat(PROPS["note"], 36, 120, outline=False, p=4, recolor={"k": "Y"})

    @card("proud_pip", "counter")
    def _(c):
        c.put("pip/proud", h=200, x=100, y=136)
        c.put("dishes/bacon_egg", w=110, x=172, y=226)
        c.pat(PROPS["star"], 206, 150, outline=False, p=4)

    @card("crybaby_pip", "counter")
    def _(c):
        c.put("pip/crying", h=210, y=146)
        c.put("ingredients/onion", h=66, x=200, y=230)

    @card("travel_souvenir", "dining")
    def _(c):
        c.put("customers/tourist_happy", h=190, x=110, y=124)
        photo = ["wwwwwwwwwww"] + ["wlllllllllw"] * 7 + ["wwwwwwwwwww"] * 3
        c.pat(photo, 180, 214, p=6, rot=-8)
        c.put("dishes/tomato_toast", w=52, x=180, y=204)

    @card("happy_office", "dining")
    def _(c):
        c.put("customers/office_happy", h=200, y=130)
        c.put("dishes/full_breakfast", w=110, x=W / 2, y=236)

    @card("student_feast", "dining")
    def _(c):
        c.put("customers/student_happy", h=190, y=120)
        c.put("dishes/full_breakfast", w=150, x=W / 2, y=226)

    @card("quiet_afternoon", "dawn")
    def _(c):
        c.put("customers/calm_idle", h=200, x=110, y=132)
        paper = ["wwwwwwwww", "wSSSwSSSw", "wwwwwwwww", "wSSSwSSSw", "wSSSwSSSw", "wwwwwwwww"]
        c.pat(paper, 70, 238, rot=6)
        cup = ["..wwwww..", "..wnnnw..", "..wwwwwww", "..wwwww.w", "..wwwwwww", "wwwwwwwww"]
        c.pat(cup, 184, 236)
        steam(c, 180, 196, n=2, spread=12, length=5)

    @card("sea_king", "sea")
    def _(c):
        c.put("ingredients/fish", w=200, y=170, rot=-8)
        x, y = c.at(0.8, 0.12)
        c.pat(PROPS["crown"], x, y - 10, p=6, rot=-14)

    @card("sneaky_fondue", "night")
    def _(c):
        pot = ["...yyyyyyyy...", ".yYYyyyyyyyyy.", "rrrrrrrrrrrrrr", "rRrrrrrrrrrrRr", ".rRrrrrrrrrRr.", "..rrrrrrrrrr..",
               "...nn....nn...", "..nn......nn.."]
        c.pat(pot, W / 2, 210, p=9)
        c.pat(["..o..", ".oyo.", "oyYyo", ".yoy."], W / 2, 262, outline=False)
        ing(c, "cheese", 80, x=W / 2, y=120, rot=-10, face_kw=None)
        face(c, W / 2 + 6, 128, eyes="side", mouth="cat", blush=False)

    @card("truffle_hunter", "garden")
    def _(c):
        ing(c, "mushroom", 120, x=80, y=170, face_kw=dict(eyes="dot", mouth="small", brows="angry"))
        glass = [".sss.", "sllls", "slzls", "sllls", ".sss.", "....n", ".....n"]
        c.pat(glass, 130, 168, p=7, rot=-10)
        ing(c, "truffle", 80, x=186, y=196, face_kw=dict(eyes="closed", mouth="small", gap=5))
        c.pat(PROPS["z"], 206, 138, outline=False, p=4)

    @card("rainbow_salad", "garden")
    def _(c):
        c.layer(rainbow(), W / 2, 110)
        c.put("dishes/garden_salad", w=180, y=190)

    @card("dawn_bravas", "night")
    def _(c):
        c.put("dishes/bravas", w=180, y=200)
        c.put("decor/wall_clock", w=60, x=200, y=60)
        c.pat(PROPS["z"], 40, 150, outline=False, p=4)

    @card("contest_omelette", "dining")
    def _(c):
        c.put("dishes/spanish_omelette", w=190, y=184)
        rosette = [".bbb.", "bbybb", "byyyb", "bbybb", ".bbb.", ".b.b.", "b...b"]
        c.pat(rosette, 196, 100, p=7)
        flags = "rygbpv"
        for k, col in enumerate(flags):
            c.pat([col * 3, "." + col + "."], 26 + k * 38, 38 + (k % 2) * 4, outline=False)

    @card("herb_wizard", "magic")
    def _(c):
        c.put("ingredients/herbs", h=150, y=176)
        hat = ["......v..", ".....vv..", "....vvy..", "...vvvv..", "..vvyvvv.", "..vvvvvv.", ".vvvvvvyv", "vvvvvvvvvv",
               "yyyyyyyyyy"]
        c.pat(hat, 140, 72, p=9)
        twinkles(c, R(75), n=6, avoid=(60, 40, 190, 250))

    @card("egg_tower", "counter")
    def _(c):
        egg = egg_shape()
        for x, y in ((56, 224), (120, 224), (184, 224), (88, 158), (152, 158), (120, 92)):
            c.layer(egg, x, y)
        for x, y in ((40, 110), (206, 90)):
            c.pat(PROPS["sweat"], x, y)

    @card("tomato_rain", "dawn")
    def _(c):
        crate = ["nnnnnnnnnnnnnn", "NNNNNNNNNNNNNN", "n.n.n......n.n", "nnnnnn...nnnnn", "NNNNNNNNNNNNNN"]
        c.pat(crate, W / 2, 244, p=8)
        for x, y, h in ((60, 70, 60), (170, 50, 56), (110, 130, 64), (190, 160, 54), (50, 180, 50)):
            c.put("ingredients/tomato", h=h, x=x, y=y, rot=(x % 30) - 15)
            c.pat(["S", "S", ".", "S"], x, y - h / 2 - 16, outline=False)

    @card("coin_shower", "dining")
    def _(c):
        rng = R(78)
        for _ in range(16):
            c.pat(PROPS["coin"], rng.randrange(20, 220), rng.randrange(20, 170), p=rng.choice((3, 4)))
        c.put("pip/surprised", h=130, x=W / 2, y=214)

    @card("love_letter", "hearts")
    def _(c):
        letter = ["cccccccccccccc", "cTcccccccccTcc", "ccTcccccccTccc", "cccTccrrcTcccc", "ccccTrrrrccccc",
                  "cccccrrrrccccc", "ccccccrrcccccc", "cccccccccccccc", "cccccccccccccc"]
        c.pat(letter, W / 2, 170, p=10)
        for x, y in ((50, 70), (190, 60), (206, 240)):
            c.pat(PROPS["red_heart"], x, y, p=4)

    @card("last_second", "dining")
    def _(c):
        c.put("ingredients/clock", h=110, x=80, y=90)
        c.pat(["rr", "rr"], 80, 90, outline=False)
        c.put("dishes/bacon_egg", w=140, x=150, y=206)
        motion(c, 40, 180, n=3, length=7, gap=6)

    # discovery rares
    @card("bacon_crown", "gold")
    def _(c):
        c.put("dishes/bacon_crown", w=200, y=160)

    @card("mystic_scramble", "magic")
    def _(c):
        c.put("dishes/mystic_scramble", w=196, y=170)
        twinkles(c, R(82), n=6, avoid=(40, 90, 200, 250))

    @card("master_soup", "brulee")
    def _(c):
        c.put("dishes/master_soup", w=200, y=190)
        steam(c, W / 2, 110, n=3, spread=26, length=8)

    @card("happy_critic", "dining")
    def _(c):
        c.put("customers/critic_happy", h=210, y=140)
        book = ["wwwwwwww", "wSSSSSSw", "wwwwwwww", "wSSSSSww", "wwwwwwww", "wSSSSSSw", "wwwwwwww"]
        c.pat(book, 56, 226, p=8, rot=-8)
        c.pat(PROPS["star"], 200, 230, outline=False)

    @card("mystery_guest", "magic")
    def _(c):
        c.put("customers/mystery", h=210, y=150)
        c.pat(PROPS["question"], 206, 50)

    @card("collector_visit", "dining")
    def _(c):
        c.put("customers/collector", h=200, x=106, y=134)
        album = ["vvvvvvvvvv", "vccccccccv", "vcyyccbbcv", "vcyyccbbcv", "vccccccccv", "vcggccrrcv", "vcggccrrcv",
                 "vccccccccv", "vvvvvvvvvv"]
        c.pat(album, 180, 216, p=8, rot=8)

    @card("breakfast_rush", "counter")
    def _(c):
        c.put("dishes/full_breakfast", w=140, x=84, y=206)
        c.put("dishes/full_breakfast", w=140, x=160, y=128)
        steam(c, 196, 60, n=2, spread=16, length=5)
        motion(c, 24, 100, n=3)

    @card("perfect_trio", "counter")
    def _(c):
        frame = Image.new("RGBA", (216, 200))
        d = ImageDraw.Draw(frame)
        d.rectangle((0, 0, 215, 199), fill=rgba(PAL["k"]))
        d.rectangle((4, 4, 211, 195), fill=rgba(PAL["o"]))
        d.rectangle((8, 8, 207, 191), fill=rgba(PAL["y"]))
        d.rectangle((16, 16, 199, 183), fill=rgba(PAL["k"]))
        d.rectangle((20, 20, 195, 179), fill=(255, 248, 225, 255))
        c.layer(frame, W / 2, 150)
        for k, (x, y) in enumerate(((70, 176), (120, 116), (170, 176))):
            pan(c, x, y, w=76)
            c.pat(PROPS["star"], x - 8, y - 2, outline=False, p=4)

    @card("untouchable", "dining")
    def _(c):
        c.put("pip/proud", h=190, x=90, y=130)
        for k in range(8):
            c.put("dishes/bacon_egg", w=64, x=176 + (k % 2) * 6, y=250 - k * 16) if False else None
        plate = ["." + "s" * 12 + ".", "s" * 14, "S" * 14]
        for k in range(8):
            c.pat(plate, 184, 254 - k * 14, p=4)
        for x, y in ((40, 60), (200, 60)):
            c.pat(PROPS["red_heart"], x, y, p=4)

    # ---- epics
    @card("galactic_bread", "space")
    def _(c):
        orbit = shape(lambda u, v: 0.86 < u * u + v * v * 4 < 1, 52, 26, lambda u, v: "Y", outline=False)
        c.layer(orbit, W / 2, 150)
        c.put("ingredients/bread", h=110, y=150, rot=15)
        c.pat(PROPS["coin"], 44, 150, p=4, recolor={"y": "b", "Y": "l", "O": "B"})

    @card("rooster_king", "dawn")
    def _(c):
        c.put("customers/old_master", h=230, y=150)

    @card("rival_chef", "dining")
    def _(c):
        c.put("customers/rival_chef", h=220, y=150)

    @card("pan_on_fire", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=220, y=150)

    @card("spice_whirl", "magic")
    def _(c):
        for k in range(22):
            a = k * 0.5
            r = 44 + k * 3.4
            col = "royPgvY"[k % 7]
            c.pat([col + col, col + col], W / 2 + math.cos(a) * r, 150 + math.sin(a) * r * 1.05, p=5)
        c.put("ingredients/spice", h=130, y=150)

    @card("brulee_smile", "brulee")
    def _(c):
        c.put("brulee/happy", h=210, y=140)
        c.put("ingredients/egg", h=76, x=190, y=236)

    @card("pastry_jealousy", "brulee")
    def _(c):
        c.put("brulee/jealous", h=210, x=110, y=140)
        flan = ["....NNNNNN....", "...NOOOOOON...", "...yyyyyyyy...", "..yYyyyyyyyy..", "..yyyyyyyyyy..", ".yyyyyyyyyyyy.",
                "ssssssssssssss"]
        c.pat(flan, 186, 232, p=8)

    @card("brulee_laugh", "brulee")
    def _(c):
        c.put("brulee/laughing", h=210, x=112, y=140)
        lid = ["....ss....", "..ssssss..", ".ssssssss.", "SSSSSSSSSS"]
        c.pat(lid, 190, 226, p=8, rot=-20)
        motion(c, 206, 176, n=2, length=4)

    @card("sweet_truce", "brulee")
    def _(c):
        c.put("pip/happy", h=160, x=70, y=160)
        c.put("brulee/happy", h=190, x=170, y=150)
        c.pat(PROPS["red_heart"], W / 2, 70, p=5)

    @card("golden_egg", "gold")
    def _(c):
        c.layer(egg_shape(gw=16, gh=21, ramp=("Y", "y", "o"), p=8), W / 2, 150)
        twinkles(c, R(99), n=6, avoid=(70, 80, 170, 220))

    @card("fever_dream", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=190, y=200)
        glass = ["nnnnnnn", ".lllll.", "..yyy..", "...y...", "..l.l..", ".lyyyl.", "nnnnnnn"]
        c.pat(glass, W / 2, 76, p=9)

    @card("full_house", "dining")
    def _(c):
        c.put("customers/calm_happy", h=120, x=54, y=190)
        c.put("customers/office_happy", h=120, x=186, y=190)
        c.put("customers/student_happy", h=130, x=W / 2, y=150)

    @card("mystery_lid", "magic")
    def _(c):
        plate = ["." + "s" * 30 + ".", "s" * 32, "S" * 32]
        c.pat(plate, W / 2, 226)
        c.pat(["q" * 26] * 5, W / 2, 200, outline=False)
        c.pat(["yy......yy", "yy......yy"], W / 2, 200, outline=False, p=5)
        lid = cloche()
        c.layer(lid, W / 2, 186 - lid.height / 2)
        c.pat(PROPS["question"], 200, 60)

    @card("star_breakfast", "space")
    def _(c):
        c.put("dishes/full_breakfast", w=190, y=170)
        for x, y in ((40, 60), (200, 70), (210, 230), (30, 220)):
            c.pat(PROPS["star"], x, y, outline=False, p=4)

    @card("triple_bacon_master", None)
    def _(c):
        c.img = ref_scene("triple_bacon_master")

    @card("exploding_tomato", None)
    def _(c):
        c.img = ref_scene("exploding_tomato")

    @card("impossible_omelette", "magic")
    def _(c):
        c.put("dishes/impossible_omelette", w=200, y=170)
        twinkles(c, R(106), n=5, avoid=(30, 100, 210, 240))

    @card("void_chef", "magic")
    def _(c):
        board = Image.new("RGBA", (180, 110))
        d = ImageDraw.Draw(board)
        for i in range(5):
            for j in range(3):
                d.rectangle((i * 36 + 2, j * 36 + 2, i * 36 + 33, j * 36 + 33), fill=(255, 243, 214, 200), outline=OUTLINE, width=2)
        c.layer(board, W / 2, 210)
        c.pat(PROPS["crumb"], 150, 214)
        c.put("pip/surprised", h=130, x=W / 2, y=86)

    @card("double_fever", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=150, x=80, y=120)
        c.put("vfx/fire_pan", w=150, x=160, y=200)

    @card("combo_ten", "chalk")
    def _(c):
        chalk(c, "x10", W / 2, 90, p=10)
        pan(c, W / 2, 210, w=150, key="pans/default")

    @card("rival_defeated", "dining")
    def _(c):
        c.put("customers/rival_chef_happy", h=210, x=104, y=140)
        c.put("ui/icon_recipe", h=60, x=196, y=110, rot=-10)
        c.put("pip/thumbs_up", h=90, x=196, y=230)

    @card("high_score", "chalk")
    def _(c):
        chalk(c, "3000", W / 2, 90, p=9)
        c.put("pip/proud", h=130, x=W / 2, y=204)

    # ---- legendaries
    @card("golden_truffle", None)
    def _(c):
        c.img = ref_scene("golden_truffle")

    @card("first_recipe", "gold")
    def _(c):
        paper = ["tccccccccccct", "cccccccccccct", "cNNNNNNNNcccc", "cccccccccccct", "cNNNNNNcccccc", "cccccccccccct",
                 "cNNNNNNNNNccc", "cccccccccccct", "cNNNNcccrrccc", "ccccccccrrrcc", "tccccccccccct"]
        c.pat(paper, W / 2, 150, p=12, rot=-4)

    @card("dream_pan", "night")
    def _(c):
        c.put("pans/golden", w=200, y=170, rot=-10)
        for x, y in ((40, 60), (200, 50), (210, 240)):
            c.pat(PROPS["sparkle"], x, y, outline=False)

    @card("kitchen_heart", "counter")
    def _(c):
        c.layer(heart_shape(gw=30, gh=26, ramp=("r", "R", "R")), W / 2, 124)
        c.pat(PROPS["sparkle"], 44, 60, outline=False)
        c.pat(PROPS["sparkle"], 200, 80, outline=False)
        c.put("pip/happy", h=100, x=W / 2, y=226)

    @card("old_master_seal", "gold")
    def _(c):
        ribbon = ["rr......rr", ".rr....rr.", "..rr..rr.."]
        c.pat(ribbon, W / 2, 230, p=8)
        c.pat(seal(), W / 2, 140, p=12)

    @card("lost_recipe", "magic")
    def _(c):
        c.put("dishes/lost_recipe", w=200, y=170)
        twinkles(c, R(117), n=6, avoid=(20, 90, 220, 250))

    @card("night_visitor_card", "night")
    def _(c):
        c.put("customers/night_visitor", h=220, y=156)

    @card("legendary_critic_card", "gold")
    def _(c):
        c.put("customers/legendary_critic_happy", h=210, y=160)
        for k in range(5):
            c.pat(PROPS["star"], 40 + k * 40, 40, outline=True, p=5)

    @card("triple_fever", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=120, x=64, y=190)
        c.put("vfx/fire_pan", w=120, x=176, y=190)
        c.put("vfx/fire_pan", w=130, x=W / 2, y=106)

    return cards


def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    cards = build_cards()
    used = set()
    for card_id, (bg, draw) in cards.items():
        if only and card_id not in only:
            continue
        c = Card()
        draw(c)
        for stale in OUT.glob(f"{card_id}.*"):
            stale.unlink()
        if bg:  # a palette PNG keeps the subject's transparency for the album silhouette at a fraction of the size
            c.img.quantize(128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT / f"{card_id}.png", optimize=True)
        else:  # the reference scenes are paintings: a JPEG
            c.img.convert("RGB").save(OUT / f"{card_id}.jpg", quality=88, optimize=True)
        used.add(bg)
    for theme in sorted(b for b in used if b):
        grid_bg(BACKDROPS[theme]).convert("RGB").save(OUT / f"bg_{theme}.png", optimize=True)
    if not only:
        backdrops = {card_id: bg for card_id, (bg, _) in cards.items()}
        (ROOT / "src" / "assets" / "cardBackdrops.json").write_text(json.dumps(backdrops, indent=2) + "\n")
    return cards


if __name__ == "__main__":
    cards = main(set(sys.argv[1:]))
    print(f"✓ {len(cards)} cards in {OUT.relative_to(ROOT)}")

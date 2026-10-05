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
CHARACTERS = ("customers/", "pip/", "brulee/")


def main_body(img, keep=0.15):
    """The character alone: drops the loose bits drawn around it (hearts, puffs, sparkles, a coin), i.e. every
    separate blob much smaller than the figure (Daniel: "que no haya elementos sueltos")."""
    a = np.asarray(img).copy()
    solid = a[..., 3] > 40
    labels = np.zeros(solid.shape, np.int32)
    sizes = [0]
    h, w = solid.shape
    for y0, x0 in zip(*np.nonzero(solid)):
        if labels[y0, x0]:
            continue
        n = len(sizes)
        labels[y0, x0] = n
        stack, size = [(y0, x0)], 0
        while stack:
            y, x = stack.pop()
            size += 1
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = n
                        stack.append((ny, nx))
        sizes.append(size)
    sizes = np.array(sizes)
    small = np.nonzero(sizes < sizes.max() * keep)[0]
    a[np.isin(labels, small) | ~solid] = 0
    out = Image.fromarray(a, "RGBA")
    return out.crop(out.getbbox())


def strip_extras(img, key):
    """The hearts, sparkles and coins some poses draw touching the head (so they are not separate blobs): their
    colours, in the sprite's top right corner, are erased together with a few pixels of outline around them."""
    a = np.asarray(img).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    loose = (r > 200) & (r - g > 25) & (b > g - 5)  # pink hearts and their highlights (skin has less blue than green)
    if key.startswith("pip/"):  # Pip has no gold or blue on him: the coin and the sparkles
        loose |= ((r > 190) & (g > 140) & (b < 120) & (r - b > 90)) | ((b > 170) & (b - r > 60))
    loose[int(a.shape[0] * 0.5):] = False  # only the top right corner, where these poses draw them: never the face
    loose[:, : int(a.shape[1] * 0.7)] = False
    if not loose.any():
        return img
    grown = np.asarray(Image.fromarray((loose * 255).astype("uint8")).filter(ImageFilter.MaxFilter(11))) > 0
    out = a.copy()
    out[grown] = 0
    return Image.fromarray(out.astype("uint8"), "RGBA")


def sprite(key):
    if key not in _cache:
        path = SPRITES / f"{key}.png"
        if not path.exists():
            path = ROOT / "assets" / f"pan_{key.split('/')[1]}.png"
        img = Image.open(path).convert("RGBA")
        img = img.crop(img.getbbox())
        _cache[key] = main_body(strip_extras(img, key)) if key.startswith(CHARACTERS) else img
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

# Faces in the style of the reference cards (assets/ref/cards_ref.jpg): big eyes with a white shine, clear brows
# and mouths. `mirror` eyes are drawn flipped on the right-hand side.
EYES = {
    "dot": [".kk.", "kwkk", "kkkk", ".kk."],
    "big": [".kkk.", "kwwkk", "kwkkk", "kkkkk", ".kkk."],
    "happy": [".kk.", "k..k"],
    "closed": ["k..k", ".kk."],
    "side": ["kkkk", "..wk", "..kk"],
    "o": [".kk.", "k..k", "k..k", ".kk."],
    "x": ["k..k", ".kk.", ".kk.", "k..k"],
    "swirl": ["kkkk", "k..k", "k.kk", "k..."],
    "squint": ["k...", ".kk.", "...k", ".kk.", "k..."],
    "star": [".y.", "yyy", ".y."],
    "wink": ["k..k", ".kk."],
    "glow": ["yyy", "yYy", "yyy"],
}
MIRROR_EYES = {"side", "squint"}
MOUTHS = {
    "smile": ["k....k", ".kkkk."],
    "grin": ["kkkkkk", "krrrrk", ".kkkk."],
    "sad": [".kkkk.", "k....k"],
    "wavy": ["kk..kk", "..kk.."],
    "o": [".kk.", "k..k", ".kk."],
    "flat": ["kkkk"],
    "small": ["k..k", ".kk."],
    "shout": [".kkkk.", "krrrrk", "krrrrk", ".kkkk."],
    "grit": ["kkkkkk", "kwkwkk", "kkkkkk"],
    "cat": ["k.kk.k", ".k..k."],
    "pout": [".kk.", "k..k"],
}
BROWS = {
    "angry": (["kk..", "..kk"], ["..kk", "kk.."]),
    "sad": (["..kk", "kk.."], ["kk..", "..kk"]),
    "up": ([".kkk", "k..."], ["kkk.", "...k"]),
}


def face(card, x, y, eyes="dot", mouth="smile", gap=7, brows=None, blush=True, p=P, ink="k"):
    """A kawaii face centred on (x, y): eyes `gap` blocks apart, mouth below, pink cheeks. `ink`: on dark things, 'z'."""
    ink_map = {"k": ink, "w": "k" if ink != "k" else "w"}
    e = pattern(EYES[eyes], outline=False, p=p, recolor=ink_map)
    m = pattern(MOUTHS[mouth], outline=False, p=p, recolor=ink_map)
    dx = gap * p / 2
    card.layer(e, x - dx, y)
    card.layer(e.transpose(Image.FLIP_LEFT_RIGHT) if eyes in MIRROR_EYES else e, x + dx, y)
    below = e.height / 2
    if blush:
        cheek = pattern(["ppp"], outline=False, p=p)
        card.layer(cheek, x - dx - 1.5 * p, y + below + p)
        card.layer(cheek, x + dx + 1.5 * p, y + below + p)
    card.layer(m, x, y + below + 1.5 * p + m.height / 2)
    if brows:
        left, right = BROWS[brows]
        card.layer(pattern(left, outline=False, p=p, recolor=ink_map), x - dx, y - below - 1.5 * p)
        card.layer(pattern(right, outline=False, p=p, recolor=ink_map), x + dx, y - below - 1.5 * p)


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


def round_plate(card, x, y, w=210):
    """A white plate seen slightly from above, for things served on it (they sit on it, never above a line)."""
    h = round(w * 0.42)
    plate = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(plate)
    d.ellipse((0, 0, w - 1, h - 1), fill=rgba(PAL["S"]))
    d.ellipse((4, 2, w - 5, h - 7), fill=rgba(PAL["w"]))
    d.ellipse((w * 0.16, h * 0.18, w * 0.84, h * 0.74), fill=(236, 236, 230, 255))
    card.layer(with_outline(plate), x, y)


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
    """A little dance floor: a disco ball's coloured light spots on a dark wall, tiled floor."""
    if j > 56:
        return (90, 50, 150) if (i // 4 + j // 4) % 2 else (140, 90, 200)
    base = mix((50, 26, 96), (28, 14, 56), j / 56)
    if i == 30 and j < 5:
        return (180, 180, 190)
    if (i - 30) ** 2 + (j - 8) ** 2 < 14:
        return (230, 230, 240) if (i + j) % 2 else (150, 160, 190)
    spot = (i * 5 + (j // 3) * 7) % 23
    if j % 6 < 2 and spot < 2:
        return ((255, 140, 210), (140, 220, 255), (255, 230, 130))[(i + j) % 3]
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
    """A dojo morning for the samurai tomato: rising sun in a corner, bamboo, grass."""
    if j > 56:
        return (120, 170, 90) if (i + j) % 7 else (90, 140, 70)
    if (i - 48) ** 2 + (j - 12) ** 2 < 70:
        return (230, 70, 60)
    if i in (4, 5, 9, 10) and j % 9 != 0:
        return (110, 170, 90) if i in (4, 9) else (80, 140, 70)
    return mix((255, 244, 220), (250, 226, 196), j / 56)


def floor_fn(i, j):
    """Low view of the kitchen: wall with a skirting board, then the tiled floor."""
    if j < 38:
        return (250, 236, 214)
    if j < 41:
        return (170, 112, 66)
    return (200, 160, 120) if (i // 6 + j // 6) % 2 else (180, 140, 104)


def sea_window_sky(i, j, w, h):
    if j < h * 0.55:
        return mix((140, 205, 250), (200, 235, 255), j / (h * 0.55))
    wave = (j + int(1.5 * math.sin(i / 2))) % 4 == 0
    return (220, 240, 255) if wave else (60, 150, 220)


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
    "seawindow": window_fn(sea_window_sky),
}


# ---------------------------------------------------------------- the reference illustrations

REF_WINDOWS = {  # card: its art window in assets/ref/cards_ref.jpg (inside the painted frame)
    "angry_vegan": (114, 142, 364, 316),
    "burnt_egg": (484, 142, 734, 316),
    "triple_bacon_master": (854, 142, 1104, 316),
    "bacon_dj": (114, 502, 364, 676),
    "golden_truffle": (484, 502, 734, 676),
    "exploding_tomato": (854, 502, 1104, 676),
}


REF_SUBJECTS = {  # the part of each window around its subject (window coordinates): it fills the card's width
    "angry_vegan": (20, 0, 250, 174),
    "burnt_egg": (10, 0, 240, 174),
    "triple_bacon_master": (12, 0, 238, 140),  # the flexed arm whole, without the check marks of the reference card
    "bacon_dj": (5, 0, 245, 174),
    "golden_truffle": (40, 0, 212, 174),
    "exploding_tomato": (36, 0, 216, 174),
}


def ref_art(card, card_id, fade=22):
    """The reference illustration filling the card's width (Daniel: the framed version looked out of proportion):
    cropped around its subject, which is never cut, and fading at the top and bottom into the card's backdrop,
    chosen to match the illustration's own background."""
    art = Image.open(REF_CARDS).convert("RGBA").crop(REF_WINDOWS[card_id])
    if card_id == "angry_vegan":  # the bubble said "NO MEAT!!" in English: a crossed-out bacon instead
        d = ImageDraw.Draw(art)
        d.rounded_rectangle((188, 10, 244, 52), 8, fill=(255, 255, 255, 255))
        bacon = sprite("ingredients/bacon").resize((40, 40), Image.LANCZOS)
        art.alpha_composite(bacon, (196, 11))
        d.line((196, 14, 236, 48), fill=rgba(PAL["r"]), width=5)
        d.line((236, 14, 196, 48), fill=rgba(PAL["r"]), width=5)
    art = art.crop(REF_SUBJECTS[card_id])
    art = art.resize((W, round(art.height * W / art.width)), Image.LANCZOS)
    a = np.asarray(art).astype(float)
    ramp = np.ones(art.height)
    if art.height < H:
        edge = np.minimum(np.arange(art.height), np.arange(art.height)[::-1])
        ramp = np.clip(edge / fade, 0, 1)
    a[..., 3] *= ramp[:, None]
    top = max(0, (H - art.height) // 2)
    card.img.alpha_composite(Image.fromarray(a.astype("uint8"), "RGBA"), (0, top))
    card.last = (0, top, W, top + art.height)


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
        put_face(card, name, *fxy, p=face_scale or max(4, min(7, round(h / 25))), **face_kw)
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
        # Nobody knows if it is done or raw: one half toasted, the other half still pale bread.
        def half_toasted(im):
            a = np.asarray(im).astype(float)
            left = (np.arange(a.shape[1]) < a.shape[1] / 2)[None, :, None]
            pale = a[..., :3] * 0.55 + np.array([255, 240, 205]) * 0.45
            a[..., :3] = np.where(left, a[..., :3] * 0.72, pale)
            return Image.fromarray(np.clip(a, 0, 255).astype("uint8"), "RGBA")

        ing(c, "bread", 170, y=168, fx=half_toasted, face_kw=dict(eyes="side", mouth="wavy", brows="up"))

    @card("burnt_egg", "fire")
    def _(c):
        ref_art(c, "burnt_egg")

    @card("sad_tomato", "counter")
    def _(c):
        ing(c, "tomato", 170, y=168, face_kw=dict(eyes="dot", mouth="sad", brows="sad"))

    @card("normal_bacon", "counter")
    def _(c):
        ing(c, "bacon", 170, y=164, face_kw=dict(eyes="happy", mouth="smile"))

    @card("suspicious_potato", "pantry")
    def _(c):
        ing(c, "potato", 150, y=168, rot=-12, face_kw=dict(eyes="side", mouth="flat", brows="angry", blush=False))

    @card("lazy_cheese", "counter")
    def _(c):
        # Lying flat, half melted over the counter, asleep.
        drip = ["yyyyyyyyyyyyyyyyyyyy", ".yyy.yyyyy..yyyyy.yy.", "..y...yyy....yyy..y..", "......y.......y......"]
        c.pat(drip, W / 2, 222, p=6)
        ing(c, "cheese", 130, y=170, face_kw=None)
        face(c, W / 2 + 6, 178, eyes="closed", mouth="small", p=5)

    @card("shy_mushroom", "counter")
    def _(c):
        # Hiding behind the fried egg, only its blushing cap peeking out.
        ing(c, "mushroom", 120, x=132, y=126, rot=-8, face_kw=dict(eyes="closed", mouth="small", gap=6))
        c.put("ingredients/egg", w=210, x=W / 2, y=212)

    @card("crying_onion", "counter")
    def _(c):
        ing(c, "onion", 170, y=160, face_kw=dict(eyes="closed", mouth="shout", brows="sad"))
        x0, y0, x1, y1 = c.last
        for side, fx in ((-1, 0.33), (1, 0.67)):  # two streams of tears down its face
            x = x0 + (x1 - x0) * fx
            for k in range(5):
                c.pat(["b"], x + side * 4, y0 + (y1 - y0) * 0.66 + k * 7, outline=False, p=6)

    @card("lost_herbs", "counter")
    def _(c):
        # Lost: a sprig of herbs looking around, dizzy, not knowing which plate is theirs.
        ing(c, "herbs", 180, y=160, rot=-12, face_kw=dict(eyes="swirl", mouth="o", blush=False))

    @card("fish_out_of_water", "seawindow")
    def _(c):
        # It has never seen a kitchen, and now it does not want to go back: a delighted fish on the counter.
        c.put("ingredients/fish", w=210, y=196, rot=6)
        x0, y0, x1, y1 = c.last
        c.pat(["pp", "pp"], x0 + (x1 - x0) * 0.8, y0 + (y1 - y0) * 0.62, outline=False, p=5)
        c.pat(["k....k", ".kkkk."], x0 + (x1 - x0) * 0.9, y0 + (y1 - y0) * 0.72, outline=False, p=3)

    @card("dancing_bread", "stage")
    def _(c):
        ing(c, "bread", 112, x=76, y=176, rot=14, face_kw=dict(eyes="happy", mouth="grin"))
        ing(c, "bread", 112, x=166, y=168, rot=-14, face_kw=dict(eyes="happy", mouth="grin"))

    @card("double_yolk", "counter")
    def _(c):
        c.put("egg2", w=210, y=172, img=double_yolk_egg())

    @card("midnight_snack", "night")
    def _(c):
        # Made in silence with the lights off: only the light of the open fridge.
        cone = Image.new("RGBA", (W, H))
        ImageDraw.Draw(cone).polygon([(W, 90), (W, 150), (30, 250), (60, 170)], fill=(255, 236, 160, 90))
        c.img.alpha_composite(cone)
        c.pat(["sssss", "sslss", "sslss", "sssss", "sssss", "sssss", "sssss", "sssss", "sssss", "sssss"], 222, 130, p=8)
        c.put("dishes/bacon_sandwich", w=180, x=108, y=206)

    @card("crispy_bacon", "counter")
    def _(c):
        c.put("dishes/triple_bacon", w=214, y=176)

    @card("happy_bravas", "dining")
    def _(c):
        c.put("dishes/bravas", w=214, y=180)
        pick = ["..........yy", "..........yy", ".........n..", "........n...", ".......n....", "......n.....",
                ".....n......", "....n.......", "...n........", "..n........."]
        c.pat(pick, 86, 126, p=4)
        c.pat(pick, 156, 126, p=4, flip=True)

    @card("grandma_tortilla", "dining")
    def _(c):
        # Grandma's tortilla: she stands behind it, on the table, and nobody argues.
        c.put("customers/calm_angry", h=160, x=W / 2, y=104)
        c.put("dishes/spanish_omelette", w=190, x=W / 2, y=214)

    @card("lonely_salad", "dining")
    def _(c):
        # Always the first at the table: one small bowl on a big empty table.
        c.put("dishes/garden_salad", w=130, x=W / 2, y=200)

    @card("pip_apron", "counter")
    def _(c):
        c.put("pip/thumbs_up", h=226, y=146)
        x0, y0, x1, y1 = c.last
        rng = R(4)
        for colour in "roynrgy":
            x = rng.uniform(x0 + (x1 - x0) * 0.4, x0 + (x1 - x0) * 0.62)
            y = rng.uniform(y0 + (y1 - y0) * 0.66, y0 + (y1 - y0) * 0.86)
            c.pat([".%s%s" % (colour, colour), colour * 3, "%s%s." % (colour, colour)], x, y, outline=False, p=4)

    @card("dented_pan", "counter")
    def _(c):
        # Nobody remembers what dented it: a bump on the rim and a plaster over it.
        pan(c, W / 2, 168, w=220, rot=18)
        x, y = c.at(0.2, 0.3)
        plaster = ["..ttt..", ".ttttt.", "tttTttt", "ttTTTtt", "tttTttt", ".ttttt.", "..ttt.."]
        c.pat(plaster, x + 26, y + 34, p=6, rot=45)

    @card("kitchen_clock", "counter")
    def _(c):
        c.put("decor/wall_clock", w=190, y=146)

    @card("brave_egg", "counter")
    def _(c):
        # A cape on its back and a determined face: it volunteered for the first pan of the day.
        c.pat(["rrrrrrrrrr", ".rrrrrrrr.", "..rrrrrr..", "..rrrrrr..", "...rrRr...", "...rRRr..."], W / 2 - 26, 176, p=7)
        ing(c, "egg", 170, x=W / 2, y=158, rot=-6, face_kw=dict(eyes="dot", mouth="grin", brows="angry"))

    @card("rolling_potato", "floor")
    def _(c):
        # Rolling on its side across the floor, dizzy.
        ing(c, "potato", 140, x=W / 2, y=176, rot=70, face_kw=None)
        face(c, W / 2, 172, eyes="swirl", mouth="o", blush=False)

    @card("twin_tomatoes", "counter")
    def _(c):
        # One sweet, one sour: two tomatoes side by side.
        ing(c, "tomato", 124, x=72, y=176, face_kw=dict(eyes="happy", mouth="grin"))
        ing(c, "tomato", 124, x=170, y=170, rot=8, face_kw=dict(eyes="squint", mouth="pout", blush=False))

    @card("cheese_moon", "night")
    def _(c):
        # The moon in the window is made of cheese.
        moon = shape(lambda u, v: u * u + v * v < 1, 20, 20,
                     lambda u, v: "o" if (u - 0.2) ** 2 + (v + 0.3) ** 2 < 0.05 or (u + 0.4) ** 2 + (v - 0.3) ** 2 < 0.07
                     or (u - 0.35) ** 2 + (v - 0.45) ** 2 < 0.03 else "y" if u + v < 0.6 else "o")
        c.layer(moon, W / 2, 96)
        c.last = (W / 2 - moon.width / 2, 96 - moon.height / 2, W / 2 + moon.width / 2, 96 + moon.height / 2)
        put_face(c, "moon", 0.5, 0.5, eyes="closed", mouth="small")

    @card("mushroom_umbrella", "counter")
    def _(c):
        # A big cap like an umbrella: the crumbs shelter under it on the counter.
        ing(c, "mushroom", 190, x=W / 2, y=150, face_kw=dict(eyes="dot", mouth="smile"))
        for x in (82, 158):
            c.pat(["tTt", "TtT", "tTt"], x, 250, p=6)
            face(c, x, 247, eyes="closed", mouth="small", gap=2, blush=False, p=2)

    @card("onion_rings", "counter")
    def _(c):
        # Three battered rings in a row on a plate.
        plate = ["." + "s" * 34 + ".", "s" * 36, "S" * 36]
        c.pat(plate, W / 2, 200, p=6)
        for x in (58, 120, 182):
            c.layer(ring_shape(), x, 170)

    @card("herb_bouquet", "garden")
    def _(c):
        c.put("ingredients/herbs", h=150, x=100, y=150, rot=-18)
        c.put("ingredients/herbs", h=150, x=140, y=150, rot=18, flip=True)
        c.pat(["pp...pp", "pPp.pPp", ".ppPpp.", "..pPp..", ".pp.pp.", "pp...pp"], 120, 190)

    @card("jumping_fish", "counter")
    def _(c):
        # Leaping into the pan without anyone asking: the fish arched just over it.
        pan(c, W / 2, 232, w=170)
        c.put("ingredients/fish", w=170, x=W / 2, y=150, rot=-20)

    @card("bacon_wave", "counter")
    def _(c):
        # Two rashers crackling in waves.
        c.put("ingredients/bacon", h=110, x=88, y=150, rot=-12)
        c.put("ingredients/bacon", h=110, x=156, y=190, rot=12)

    @card("perfect_toast", "counter")
    def _(c):
        c.put("dishes/tomato_toast", w=214, y=176)

    @card("house_toast", "counter")
    def _(c):
        # Something different every day: today, a fried egg on the special toast.
        c.put("dishes/special_toast", w=214, y=184)
        c.put("ingredients/egg", h=84, x=W / 2, y=150)

    @card("sunday_scramble", "dawn")
    def _(c):
        c.put("dishes/cheesy_scramble", w=200, y=196)

    @card("forest_omelette", "garden")
    def _(c):
        # The mushrooms hid inside so nobody would see them. It did not work: they peek out of the omelette.
        for x, rot, eyes in ((80, -12, "dot"), (130, 6, "closed"), (176, 14, "side")):
            c.put("ingredients/mushroom", h=62, x=x, y=132, rot=rot)
            put_face(c, "mushroom", 0.5, 0.36, eyes=eyes, mouth="small", gap=4, blush=False, p=3)
        c.put("dishes/mushroom_omelette", w=210, y=190)

    @card("skewer_parade", "garden")
    def _(c):
        c.put("dishes/garden_skewer", w=214, y=170, rot=-8)

    @card("sailor_lunch", "sea")
    def _(c):
        c.put("dishes/herb_fish", w=214, y=186)

    @card("warm_stew", "rain")
    def _(c):
        c.put("dishes/fish_stew", w=200, y=190)
        steam(c, 120, 110, n=3, spread=26, length=8)

    @card("the_classic", "dining")
    def _(c):
        c.put("dishes/bacon_egg", w=214, y=176)

    @card("sandwich_tower", "counter")
    def _(c):
        sandwich(c, W / 2, 262)

    @card("pip_confused", "counter")
    def _(c):
        # Was that salt or sugar?
        c.put("pip/confused", h=230, y=146)

    @card("pip_winking", "counter")
    def _(c):
        c.put("pip/winking", h=230, y=146)

    @card("pip_worried", "counter")
    def _(c):
        c.put("pip/worried", h=230, y=146)

    @card("regular_customer", "dining")
    def _(c):
        c.put("customers/calm_happy", h=200, y=130)
        c.put("dishes/tomato_toast", w=110, x=W / 2, y=234)

    @card("student_rush", "dining")
    def _(c):
        # Exam in ten minutes, breakfast in five: running in.
        c.put("customers/student_arrive", h=220, y=146)

    @card("coffee_break", "dining")
    def _(c):
        c.put("customers/office_idle", h=200, y=130)
        cup = ["wwwwww..", "wnnnnw..", "wwwwwwww", "wwwwww.w", "wwwwwwww", ".wwww..."]
        c.pat(cup, W / 2, 236)
        steam(c, W / 2 - 6, 196, n=2, spread=14, length=5)

    @card("lost_tourist", "dining")
    def _(c):
        # Lost: sunglasses, a holiday shirt and a camera round the neck, arms up asking the way.
        c.put("customers/tourist_happy", h=210, y=140)
        x, y = c.at(0.5, 0.7)
        camera = ["..ss......", "kkkkkkkkkk", "kSSSllSSSk", "kSSlbblSSk", "kSSlbblSSk", "kSSSllSSSk", "kkkkkkkkkk"]
        c.pat(["n" + "." * 12 + "n", ".n" + "." * 10 + "n.", "..n" + "." * 8 + "n.."], x, y - 26, outline=False, p=4)
        c.pat(camera, x, y, p=6)

    @card("fallen_tip", "floor")
    def _(c):
        # The tip that rolled away: a big coin standing on its edge on the floor.
        c.pat(["." + "q" * 12 + "."], W / 2, 236, outline=False, p=8)
        c.put("ui/icon_coin", h=150, y=162, rot=-8)

    @card("steam_cloud", "dawn")
    def _(c):
        # Something burnt: a cloud of smoke rising from the pan on the stove.
        c.put("vfx/smoke", w=200, x=W / 2, y=104, fx=lambda im: tint(im, lambda rgb: rgb * 0.35 + 150))
        pan(c, W / 2, 222, w=200)

    @card("fridge_note", "fridge")
    def _(c):
        # "Do not touch": a note held on the fridge door by a magnet.
        note = ["....rr....", "...rRRr...", "yyyyyyyyyy", "yyyyyyyyyy", "yNNNNNNyyy", "yyyyyyyyyy", "yNNNNNNNNy",
                "yyyyyyyyyy", "yNNNNyyyyy", "yyyyyyyyyy", "yyyyyyyyyy", "yyyyyyyyyy"]
        c.pat(note, 110, 140, p=12, rot=-6)

    @card("morning_kitchen", "dawn")
    def _(c):
        c.put("ingredients/bread", h=120, y=212)
        steam(c, W / 2, 150, n=3, spread=22, length=5)

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
    @card("angry_vegan", "garden")
    def _(c):
        ref_art(c, "angry_vegan")

    @card("bacon_dj", "stage")
    def _(c):
        # The reference DJ spins a pan: two sizzling rashers of bacon go on it, the DJ of bacon.
        ref_art(c, "bacon_dj")
        x0, y0, x1, y1 = c.last
        for dx, rot in ((-0.12, 12), (0.1, -10)):
            c.put("ingredients/bacon", h=34, x=x0 + (x1 - x0) * (0.5 + dx), y=y0 + (y1 - y0) * 0.6, rot=rot)

    @card("samurai_tomato", "sun")
    def _(c):
        # Headband, and a katana on its back: the hilt shows over its shoulder.
        sword = ["z" + "s" * 26 + "y" + "nknknk"]
        c.pat(sword, 130, 120, p=6, rot=40)
        ing(c, "tomato", 160, y=170, face_kw=dict(eyes="dot", mouth="flat", brows="angry", blush=False))
        x0, y0, x1, y1 = c.last
        band_y = y0 + (y1 - y0) * 0.38
        cols = int((x1 - x0) * 0.9 / 5)
        c.pat(["r" * cols, "R" * cols], W / 2, band_y, p=5)
        c.pat(["rr..", ".rr.", "..rr", "..rr"], x1 - 4, band_y + 20, p=5)

    @card("astronaut_egg", "space")
    def _(c):
        # An egg in its astronaut helmet, floating in space.
        ing(c, "egg", 140, x=W / 2, y=150, rot=-15, face_kw=dict(eyes="big", mouth="o"))
        helmet = bubble_helmet().resize((200, 200), Image.NEAREST)
        c.layer(helmet, W / 2, 150)

    @card("grumpy_grandma", "dining")
    def _(c):
        c.put("customers/calm_angry", h=230, y=140)

    @card("sleepy_pip", "night")
    def _(c):
        # Asleep on the counter, late at night.
        c.put("pip/sleeping", h=220, y=160)

    @card("alien_tourist", "space")
    def _(c):
        # A tourist from another world, camera round its neck.
        c.put("customers/tourist", h=220, y=150)
        x, y = c.at(0.5, 0.72)
        camera = ["..ss......", "kkkkkkkkkk", "kSSSllSSSk", "kSSlbblSSk", "kSSlbblSSk", "kSSSllSSSk", "kkkkkkkkkk"]
        c.pat(camera, x, y, p=6)

    @card("champions_breakfast", "dining")
    def _(c):
        c.put("dishes/full_breakfast", w=214, y=176)

    @card("batter_king", "counter")
    def _(c):
        c.put("dishes/fish_chips", w=200, y=180)
        c.pat(PROPS["crown"], 96, 112, p=6, rot=-12)

    @card("kitchen_in_love", "hearts")
    def _(c):
        # Cooked with love: a heart-shaped fried egg on its plate.
        round_plate(c, W / 2, 196, w=220)
        c.layer(heart_shape(gw=24, gh=21, ramp=("w", "w", "c")), W / 2, 172)
        yolk = shape(lambda u, v: u * u + v * v < 1, 9, 9, lambda u, v: "z" if (u + 0.35) ** 2 + (v + 0.35) ** 2 < 0.08 else "y" if u + v < 0.5 else "o")
        c.layer(yolk, W / 2, 162)

    @card("midnight_kitchen", "night")
    def _(c):
        # When everybody sleeps, the pans tell each other stories: two pans chatting on the counter.
        pan(c, 70, 214, w=120, rot=0, flip=True)
        put_face(c, "pan", 0.62, 0.5, eyes="happy", mouth="grin", p=4, ink="z")
        pan(c, 172, 214, w=120)
        put_face(c, "pan", 0.38, 0.5, eyes="dot", mouth="o", p=4, ink="z")

    @card("party_pip", "stage")
    def _(c):
        c.put("pip/celebrating", h=230, y=156)

    @card("proud_pip", "counter")
    def _(c):
        c.put("pip/proud", h=230, y=146)

    @card("crybaby_pip", "counter")
    def _(c):
        c.put("pip/crying", h=230, y=146)

    @card("travel_souvenir", "dining")
    def _(c):
        # A photo of a toast, the best souvenir of the trip, propped up on the table.
        photo = Image.new("RGBA", (150, 172), rgba(PAL["w"]))
        d = ImageDraw.Draw(photo)
        d.rectangle((12, 12, 137, 130), fill=rgba(PAL["l"]))
        d.rectangle((12, 92, 137, 130), fill=(230, 70, 70, 255))
        toast = sprite("dishes/tomato_toast")
        toast = toast.resize((104, round(toast.height * 104 / toast.width)), Image.LANCZOS)
        photo.alpha_composite(toast, (23, 130 - toast.height - 4))
        photo = with_outline(photo).rotate(-8, Image.BICUBIC, expand=True)
        c.layer(photo, W / 2, 158)

    @card("happy_office", "dining")
    def _(c):
        c.put("customers/office_happy", h=200, y=130)
        c.put("dishes/full_breakfast", w=110, x=W / 2, y=236)

    @card("student_feast", "dining")
    def _(c):
        c.put("customers/student_happy", h=190, y=120)
        c.put("dishes/full_breakfast", w=150, x=W / 2, y=226)

    @card("quiet_afternoon", "dining")
    def _(c):
        # A cup of tea and no hurry.
        c.put("customers/calm_idle", h=200, y=128)
        cup = ["..wwwwww...", "..wnnnnw...", "..wwwwwwww.", "..wwwwww.w.", "..wwwwwwww.", "wwwwwwwwwww"]
        c.pat(cup, W / 2, 240, p=6)

    @card("sea_king", "sea")
    def _(c):
        c.put("ingredients/fish", w=200, y=176, rot=-8)
        a = np.asarray(c.img)[..., 3]
        cols = np.nonzero(a.max(axis=0) > 0)[0]
        head_x = cols.max() - 36  # the head is on the right; its top edge is where the crown sits
        head_y = np.nonzero(a[:, head_x] > 0)[0].min()
        c.pat(PROPS["crown"], head_x, head_y - 14, p=6, rot=-10)

    @card("sneaky_fondue", "night")
    def _(c):
        # The cheese melted by itself while nobody watched: a wedge sneaking over the rim of the fondue pot.
        pot = ["....yyyyyyyyyyyy....", "..yyYYyyyyyyyyyyyy..", ".rrrrrrrrrrrrrrrrrr.", "rrRRrrrrrrrrrrrrrRrr", "rrRrrrrrrrrrrrrrrRrr",
               ".rrRrrrrrrrrrrrRrrr.", "..rrrrrrrrrrrrrrrr..", "....rrrrrrrrrrrr....", ".....nnn....nnn.....", "....nn........nn...."]
        c.put("ingredients/cheese", h=86, x=84, y=150, rot=20)
        face(c, 84, 158, eyes="side", mouth="cat", blush=False, p=4)
        c.pat(pot, W / 2, 210, p=8)
        c.pat(["..o..", ".oyo.", "oyYyo", ".yoy."], W / 2, 266, outline=False, p=5)

    @card("truffle_hunter", "garden")
    def _(c):
        # The mushroom found the truffle; the truffle pretends to be asleep.
        ing(c, "mushroom", 140, x=80, y=172, face_kw=dict(eyes="dot", mouth="small", brows="angry"))
        ing(c, "truffle", 96, x=180, y=204, face_kw=dict(eyes="closed", mouth="small", gap=5))

    @card("rainbow_salad", "garden")
    def _(c):
        c.layer(rainbow(), W / 2, 110)
        c.put("dishes/garden_salad", w=180, y=190)

    @card("dawn_bravas", "dawn")
    def _(c):
        # Nobody orders bravas at four in the morning. Until somebody does: bravas in the first light.
        c.put("dishes/bravas", w=210, y=196)

    @card("contest_omelette", "dining")
    def _(c):
        # Prize-winning omelette: the first-prize rosette pinned on its plate.
        c.put("dishes/spanish_omelette", w=210, y=176)
        rosette = [".bbbbb.", "bbyyybb", "byyyyyb", "byyyyyb", "bbyyybb", ".bbbbb.", ".bb.bb.", ".b...b."]
        c.pat(rosette, 196, 222, p=7)
        chalk(c, "1", 196, 208, p=4, color="O")

    @card("herb_wizard", "magic")
    def _(c):
        c.put("ingredients/herbs", h=160, y=188)
        hat = ["......v..", ".....vv..", "....vvy..", "...vvvv..", "..vvyvvv.", "..vvvvvv.", ".vvvvvvyv", "vvvvvvvvvv",
               "yyyyyyyyyy"]
        c.pat(hat, 124, 100, p=9)

    @card("egg_tower", "counter")
    def _(c):
        # A perfect balance: whole eggs stacked one on top of another, a little crooked.
        egg = egg_shape()
        for k, dx in enumerate((0, 6, -4, 5)):
            c.layer(egg, W / 2 + dx, 232 - k * 62)

    @card("tomato_rain", "dawn")
    def _(c):
        # The market crate broke: an open crate, and the tomatoes tumbling out of it.
        crate = ["n..............n", "nnnnnnnnnnnnnnnn", "NNNNNNNNNNNNNNNN", "n..n..n..n..n..n", "nnnnnnnnnn......", "NNNNNNNNNN..nn..",
                 "n..n..n..n...nn."]
        c.pat(crate, W / 2, 238, p=8)
        for x, y, h in ((78, 190, 60), (150, 186, 58), (116, 150, 62), (176, 126, 54), (62, 118, 50)):
            c.put("ingredients/tomato", h=h, x=x, y=y, rot=(x % 30) - 15)

    @card("coin_shower", "dining")
    def _(c):
        # Such a big tip: a heap of coins on the table, and more still dropping onto it.
        rng = R(78)
        for row, (y, n) in enumerate(((246, 7), (226, 6), (206, 5), (186, 4), (166, 3))):
            for k in range(n):
                c.pat(PROPS["coin"], W / 2 + (k - (n - 1) / 2) * 30 + rng.uniform(-3, 3), y, p=6)
        for x, y in ((92, 110), (150, 90), (120, 54)):
            c.pat(PROPS["coin"], x, y, p=6)

    @card("love_letter", "hearts")
    def _(c):
        # Not a letter: a recipe, written with love, sticking out of the envelope.
        paper = ["cccccccccc", "cNNNNNNccc", "cccccccccc", "cNNNNNNNNc", "cccccccccc", "cNNNNcrrcc", "ccccccrrrc"]
        c.pat(paper, W / 2, 124, p=11, rot=6)
        letter = ["cccccccccccccc", "cTcccccccccTcc", "ccTcccccccTccc", "cccTccrrcTcccc", "ccccTrrrrccccc",
                  "cccccrrrrccccc", "ccccccrrcccccc", "cccccccccccccc"]
        c.pat(letter, W / 2, 200, p=11)

    @card("last_second", "dining")
    def _(c):
        # The clock said zero when the plate reached the table: a big stopwatch, its hand at zero.
        watch = Image.new("RGBA", (180, 208))
        d = ImageDraw.Draw(watch)
        d.rectangle((76, 0, 104, 22), fill=rgba(PAL["S"]))
        d.ellipse((6, 24, 173, 191), fill=rgba(PAL["w"]), outline=rgba(PAL["S"]), width=14)
        for k in range(12):
            a = k * math.pi / 6
            d.line((90 + math.sin(a) * 62, 108 - math.cos(a) * 62, 90 + math.sin(a) * 72, 108 - math.cos(a) * 72), fill=OUTLINE, width=4)
        d.line((90, 108, 90, 46), fill=rgba(PAL["r"]), width=8)
        d.ellipse((82, 100, 98, 116), fill=OUTLINE)
        c.layer(with_outline(watch), W / 2, 150)

    # discovery rares
    @card("bacon_crown", "gold")
    def _(c):
        # Two rashers protect the most fragile one: bacon, crowned egg, bacon (the recipe's line).
        plate = ["." + "s" * 34 + ".", "s" * 36, "S" * 36]
        c.pat(plate, W / 2, 214, p=6)
        c.put("ingredients/bacon", h=96, x=62, y=170, rot=-70)
        c.put("ingredients/bacon", h=96, x=178, y=170, rot=70)
        ing(c, "egg", 100, x=W / 2, y=172, face_kw=dict(eyes="happy", mouth="small"), face_scale=4)

    @card("mystic_scramble", "magic")
    def _(c):
        c.put("dishes/mystic_scramble", w=214, y=170)

    @card("master_soup", "brulee")
    def _(c):
        c.put("dishes/master_soup", w=200, y=190)
        steam(c, W / 2, 110, n=3, spread=26, length=8)

    @card("happy_critic", "dining")
    def _(c):
        c.put("customers/critic_happy", h=230, y=146)

    @card("mystery_guest", "magic")
    def _(c):
        c.put("customers/mystery", h=220, y=150)

    @card("collector_visit", "dining")
    def _(c):
        c.put("customers/collector", h=230, y=146)

    @card("breakfast_rush", "counter")
    def _(c):
        # Two full breakfasts at once, plate behind plate on the counter.
        c.put("dishes/full_breakfast", w=170, x=150, y=150)
        c.put("dishes/full_breakfast", w=170, x=92, y=206)

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
        for x, y in ((70, 176), (120, 116), (170, 176)):
            pan(c, x, y, w=76)
            c.pat(PROPS["star"], x - 8, y - 2, outline=False, p=4)

    @card("untouchable", "dining")
    def _(c):
        # Nobody left hungry: Pip, proud, next to the pile of empty plates.
        c.put("pip/proud", h=200, x=92, y=140)
        plate = ["." + "s" * 12 + ".", "s" * 14, "S" * 14]
        for k in range(8):
            c.pat(plate, 184, 254 - k * 14, p=4)

    # ---- epics
    @card("galactic_bread", "space")
    def _(c):
        orbit = shape(lambda u, v: 0.86 < u * u + v * v * 4 < 1, 56, 28, lambda u, v: "Y", outline=False)
        c.layer(orbit, W / 2, 150)
        c.put("ingredients/bread", h=130, y=150, rot=15)

    @card("rooster_king", "dawn")
    def _(c):
        c.put("customers/old_master", h=230, y=150)

    @card("rival_chef", "fire")
    def _(c):
        # Comes to taste your dishes and copy them: the rival and his own sushi, as a challenge.
        c.put("customers/rival_chef", h=230, y=146)

    @card("pan_on_fire", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=220, y=150)

    @card("spice_whirl", "magic")
    def _(c):
        # A pinch of everything: the jar and one swirl of spices winding round it.
        swirl = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(swirl)
        points = [(W / 2 + math.cos(k * 0.12) * (40 + k * 0.9), 150 + math.sin(k * 0.12) * (40 + k * 0.9) * 0.55) for k in range(90)]
        for k in range(len(points) - 1):
            d.line(points[k] + points[k + 1], fill=rgba(PAL["roy"[k * 3 // len(points)]]), width=9)
        c.img.alpha_composite(with_outline(swirl))
        c.put("ingredients/spice", h=140, y=150)

    @card("brulee_smile", "brulee")
    def _(c):
        c.put("brulee/happy", h=230, y=146)

    @card("pastry_jealousy", "brulee")
    def _(c):
        c.put("brulee/jealous", h=206, x=100, y=140)
        flan = ["....NNNNNN....", "...NOOOOOON...", "...yyyyyyyy...", "..yYyyyyyyyy..", "..yyyyyyyyyy..", ".yyyyyyyyyyyy.",
                "ssssssssssssss", ".SSSSSSSSSSSS."]
        c.pat(flan, 180, 230, p=7)

    @card("brulee_laugh", "brulee")
    def _(c):
        c.put("brulee/laughing", h=230, y=146)

    @card("sweet_truce", "brulee")
    def _(c):
        c.put("pip/happy", h=170, x=72, y=162)
        c.put("brulee/happy", h=200, x=168, y=150)

    @card("golden_egg", "gold")
    def _(c):
        # An egg of gold: it cannot be fried.
        c.layer(egg_shape(gw=18, gh=24, ramp=("Y", "y", "o"), p=7), W / 2, 150)

    @card("fever_dream", "magic")
    def _(c):
        # When the kitchen burns for real, time slows down: a pan in dreamy violet flames.
        c.put("vfx/fire_pan", w=220, y=160, fx=lambda im: tint(im, lambda rgb: rgb[..., [2, 1, 0]] * np.array([1.0, 0.7, 1.2]) + np.array([60, 0, 40])))

    @card("full_house", "dining")
    def _(c):
        # Not a free chair: three happy customers at the table, all inside the card.
        c.put("customers/calm_happy", h=112, x=58, y=196)
        c.put("customers/office_happy", h=112, x=180, y=196)
        c.put("customers/student_happy", h=124, x=W / 2, y=148)

    @card("mystery_lid", "magic")
    def _(c):
        plate = ["." + "s" * 30 + ".", "s" * 32, "S" * 32]
        c.pat(plate, W / 2, 226)
        c.pat(["q" * 26] * 5, W / 2, 200, outline=False)
        c.pat(["yy......yy", "yy......yy"], W / 2, 200, outline=False, p=5)
        lid = cloche()
        c.layer(lid, W / 2, 186 - lid.height / 2)

    @card("star_breakfast", "space")
    def _(c):
        c.put("dishes/full_breakfast", w=214, y=164)

    @card("triple_bacon_master", "fire")
    def _(c):
        ref_art(c, "triple_bacon_master")

    @card("exploding_tomato", "fire")
    def _(c):
        ref_art(c, "exploding_tomato")

    @card("impossible_omelette", "magic")
    def _(c):
        # Four eggs in a square on one plate: the books said it could not be done.
        round_plate(c, W / 2, 168, w=230)
        for x, y in ((86, 140), (154, 140), (86, 184), (154, 184)):
            c.put("ingredients/egg", w=82, x=x, y=y)

    @card("void_chef", "magic")
    def _(c):
        # When the bell rings the counter is almost clean: Pip behind the empty board, one crumb left on it.
        c.put("pip/surprised", h=170, x=W / 2, y=110)
        board = Image.new("RGBA", (200, 110))
        d = ImageDraw.Draw(board)
        d.rectangle((0, 0, 199, 109), fill=rgba(PAL["n"]), outline=OUTLINE, width=3)
        for i in range(5):
            for j in range(3):
                d.rectangle((6 + i * 38, 4 + j * 35, 38 + i * 38, 36 + j * 35), fill=(255, 243, 214, 255), outline=OUTLINE, width=2)
        c.layer(board, W / 2, 222)
        c.pat(PROPS["crumb"], 158, 226)

    @card("double_fever", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=150, x=80, y=120)
        c.put("vfx/fire_pan", w=150, x=160, y=200)

    @card("combo_ten", "chalk")
    def _(c):
        # Ten dishes in a row, chalked up big on the board.
        chalk(c, "x10", W / 2, 150, p=14)

    @card("rival_defeated", "dining")
    def _(c):
        # He came to criticise and left convinced: the rival, smiling at last.
        c.put("customers/rival_chef_happy", h=230, y=146, flip=True)

    @card("high_score", "chalk")
    def _(c):
        # 3000 points in one service, chalked on the wall.
        chalk(c, "3000", W / 2, 150, p=11)

    # ---- legendaries
    @card("golden_truffle", "gold")
    def _(c):
        ref_art(c, "golden_truffle")

    @card("first_recipe", "gold")
    def _(c):
        paper = ["tccccccccccct", "cccccccccccct", "cNNNNNNNNcccc", "cccccccccccct", "cNNNNNNcccccc", "cccccccccccct",
                 "cNNNNNNNNNccc", "cccccccccccct", "cNNNNcccrrccc", "ccccccccrrrcc", "tccccccccccct"]
        c.pat(paper, W / 2, 150, p=12, rot=-4)

    @card("dream_pan", "night")
    def _(c):
        c.put("pans/golden", w=214, y=170, rot=-10)

    @card("kitchen_heart", "counter")
    def _(c):
        # The heart of the kitchen, big and red, resting on the counter.
        c.layer(heart_shape(gw=34, gh=30, ramp=("r", "R", "R")), W / 2, 150)

    @card("old_master_seal", "gold")
    def _(c):
        ribbon = ["rr......rr", ".rr....rr.", "..rr..rr.."]
        c.pat(ribbon, W / 2, 232, p=8)
        wax = ["....rrrrrr....", "..rrrrrrrrrr..", ".rrRRRRRRRRrr.", ".rRrrrrrrrrRr.", "rrRrrRRRrrrRrr", "rRrrRRRRRrrrRr",
               "rRrrRRRRRRRRRr", "rRrrRRRRRrrrRr", "rrRrrRRRrrrRrr", ".rRrrrrrrrrRr.", ".rrRRRRRRRRrr.", "..rrrrrrrrrr..",
               "....rrrrrr...."]
        c.pat(wax, W / 2, 140, p=12)

    @card("lost_recipe", "magic")
    def _(c):
        # The recipe nobody finished: an old page, torn across.
        paper = ["tccccccccct", "cNNNNNNcccc", "ccccccccccT", "cNNNNNNNNcc", "cccccccccc.", "cNNNNNcc...", "cccccc.....",
                 "cNNNc......", "ccc........"]
        c.pat(paper, W / 2, 150, p=17, rot=-6)

    @card("night_visitor_card", "night")
    def _(c):
        # Arrives when the lights go out: seen in the dark, only its glowing eyes.
        c.put("customers/night_visitor", h=230, y=156, fx=lambda im: tint(im, lambda rgb: rgb * np.array([0.3, 0.32, 0.5])))
        x0, y0, x1, y1 = c.last
        for fx in (0.41, 0.59):
            c.pat(EYES["glow"], x0 + (x1 - x0) * fx, y0 + (y1 - y0) * 0.5, outline=False, p=5)

    @card("legendary_critic_card", "gold")
    def _(c):
        # Five stars: the critic, delighted, under his five stars.
        c.put("customers/legendary_critic_happy", h=210, y=166)
        for k in range(5):
            c.pat(PROPS["star"], 40 + k * 40, 40, outline=True, p=5)

    @card("triple_fever", "fire")
    def _(c):
        c.put("vfx/fire_pan", w=120, x=64, y=190)
        c.put("vfx/fire_pan", w=120, x=176, y=190)
        c.put("vfx/fire_pan", w=130, x=W / 2, y=106)

    return cards


# Cards whose art is meant to reach the edges: the reference illustrations and the fridge's light.
FULL_BLEED = set(REF_WINDOWS) | {"midnight_snack"}
MARGIN = 5


def fit_inside(img):
    """Nothing is cut off (Daniel): if the art reaches the card's edges, it is scaled down around its centre and
    moved inside a small margin."""
    box = img.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    if x0 >= MARGIN and y0 >= MARGIN and x1 <= W - MARGIN and y1 <= H - MARGIN:
        return img
    full = img.getbbox()
    art = img.crop(full)
    scale = min(1, (W - 2 * MARGIN) / (x1 - x0), (H - 2 * MARGIN) / (y1 - y0))
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left = round(full[0] + (full[2] - full[0]) * (1 - scale) / 2)
    top = round(full[1] + (full[3] - full[1]) * (1 - scale) / 2)
    left = min(max(left, MARGIN - round((x0 - full[0]) * scale)), W - MARGIN - round((x1 - full[0]) * scale))
    top = min(max(top, MARGIN - round((y0 - full[1]) * scale)), H - MARGIN - round((y1 - full[1]) * scale))
    out = Image.new("RGBA", (W, H))
    out.alpha_composite(art, (max(0, left), max(0, top)))
    return out


def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    cards = build_cards()
    used = set()
    for card_id, (bg, draw) in cards.items():
        if only and card_id not in only:
            continue
        c = Card()
        draw(c)
        if card_id not in FULL_BLEED:
            c.img = fit_inside(c.img)
        for stale in OUT.glob(f"{card_id}.*"):
            stale.unlink()
        if bg:  # a palette PNG keeps the subject's transparency for the album silhouette at a fraction of the size
            c.img.quantize(192, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT / f"{card_id}.png", optimize=True)
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

"""Menu art: the loading illustration (assets/ref/loading_ref.jpg, never modified) without its English "Loading..."
text and bar, and without the frying pan that seemed to float in front of the window (Daniel: "hay una sartén
flotando en la ventana"). The big pan cooking at the bottom stays: the menu shows it whole, with sparks over it.

It also cuts that cooking pan out as its own layer (ui/menu_pan.png, same size, transparent above the pan's rim): the
menu draws a bigger Pip between the scene and the pan, so Pip stands behind the stove instead of floating small in
front of the cupboards (Daniel: "Pip es muy pequeño en esa pantalla y flota frente al mueble").

Dev tool, not part of the game: `python3 scripts/menu_scene.py` (needs Pillow + numpy). Writes
src/assets/sprites/ui/menu_scene.jpg and menu_pan.png.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "assets" / "ref"
UI = ROOT / "src" / "assets" / "sprites" / "ui"
OUT = UI / "menu_scene.jpg"
PAN_OUT = UI / "menu_pan.png"
WIDTH = 720

# In the 720 px wide scene: the pan's bowl (ellipse) and handle (segment), the window's lower panes, its vertical bar
# and the top of the sill under them.
BOWL = (557.5, 372.5, 44, 40)  # centre x, centre y, radius x, radius y (outline included)
HANDLE = ((588, 361), (634, 323), 11)  # from, to, half thickness
PANES_LEFT = 466  # left edge of the lower-left pane
CLEAN_SPAN = 49  # clean columns of the lower-left pane, left of the pan, reused as scenery
SHINE = (613, 327, 4)  # the handle's highlight, just past its outline: x, y, radius
BAR = (545, 567)  # the window's vertical bar
BAR_SOURCE_Y = 326  # a row of the bar just above the pan
SILL_TOP = 391
SILL_UNDER_PAN = (508, 606, 419)  # x from, x to, y to: the sill under the pan and its shadow, redone whole
SILL_SPAN = (470, 45)  # clean stretch of the sill, left of the pan


def scene():
    loading = Image.open(REF / "loading_ref.jpg")
    img = loading.crop((0, 0, loading.width, int(loading.height * 0.62)))
    return img.resize((WIDTH, round(WIDTH * img.height / img.width)), Image.LANCZOS).convert("RGB")


def pan_mask(h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx, cy, rx, ry = BOWL
    mask = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    (x0, y0), (x1, y1), half = HANDLE
    dx, dy = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy), 0, 1)
    mask |= np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy)) <= half
    mask |= np.hypot(xx - SHINE[0], yy - SHINE[1]) <= SHINE[2]
    sx0, sx1, sy1 = SILL_UNDER_PAN
    mask[SILL_TOP:sy1, sx0:sx1] = True
    return mask


def remove_window_pan(img):
    """Rebuilds what the pan covered from the window itself: the bar continues straight down, the sill repeats its
    clean stretch and the panes reuse the trees of the clean part of the lower-left pane."""
    a = np.asarray(img).copy()
    mask = pan_mask(*a.shape[:2])
    for y, x in zip(*np.nonzero(mask)):
        if y >= SILL_TOP:
            a[y, x] = a[y, SILL_SPAN[0] + (x - SILL_SPAN[0]) % SILL_SPAN[1]]
        elif BAR[0] <= x < BAR[1]:
            a[y, x] = a[BAR_SOURCE_Y, x]
        else:
            start = PANES_LEFT if x < BAR[0] else BAR[1]
            a[y, x] = a[y, PANES_LEFT + (x - start) % CLEAN_SPAN]
    return Image.fromarray(a)


# The cooking pan's rim: its dark outline, searched for in these rows, fitted as a smooth curve over the columns where
# Pip stands (the rest of the pan is never covered).
RIM_ROWS = (668, 735)
RIM_COLUMNS = (150, 570)
RIM_DARK = 70  # max mean channel value of the outline


def rim_curve(a):
    """Parabola through the rim's outline, ignoring columns where something else (a wisp of steam, a spark) is
    darker first."""
    xs, ys = [], []
    for x in range(*RIM_COLUMNS):
        rows = np.nonzero(a[RIM_ROWS[0]:RIM_ROWS[1], x].mean(axis=1) < RIM_DARK)[0]
        if len(rows):
            xs.append(x)
            ys.append(RIM_ROWS[0] + rows[0])
    xs, ys = np.array(xs, float), np.array(ys, float)
    keep = np.ones(len(xs), bool)
    for _ in range(5):
        coef = np.polyfit(xs[keep], ys[keep], 2)
        keep = np.abs(np.polyval(coef, xs) - ys) < 4
    return coef


def pan_layer(img):
    """The pan at the bottom on its own, from the rim down, transparent above (and outside Pip's columns)."""
    a = np.asarray(img)
    h, w = a.shape[:2]
    coef = rim_curve(a)
    alpha = np.zeros((h, w), np.uint8)
    for x in range(*RIM_COLUMNS):
        alpha[int(round(np.polyval(coef, x))):, x] = 255
    rgb = np.where(alpha[..., None] > 0, a, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def main():
    img = remove_window_pan(scene())
    img.save(OUT, quality=88)
    pan_layer(img).save(PAN_OUT, optimize=True)
    for path in (OUT, PAN_OUT):
        print("✓", path.relative_to(ROOT), f"{path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

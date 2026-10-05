"""Menu art: the loading illustration (assets/ref/loading_ref.jpg, never modified) without its English "Loading..."
text and bar, and without the frying pan that seemed to float in front of the window (Daniel: "hay una sartén
flotando en la ventana"). The big pan cooking at the bottom stays: the menu shows it whole, with sparks over it.

Dev tool, not part of the game: `python3 scripts/menu_scene.py` (needs Pillow + numpy). Writes
src/assets/sprites/ui/menu_scene.jpg.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "assets" / "ref"
OUT = ROOT / "src" / "assets" / "sprites" / "ui" / "menu_scene.jpg"
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


def main():
    remove_window_pan(scene()).save(OUT, quality=88)
    print("✓", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()

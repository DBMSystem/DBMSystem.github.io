"""Cuts game sprites out of the reference images in assets/ref/ (D-2).

Dev tool, not part of the game: `python3 scripts/extract_sprites.py` (needs Pillow + numpy).
Background is removed with a flood fill from the crop border, so each crop must be
surrounded by the reference's plain background. Outputs:
  src/assets/sprites/<group>/<id>.png   sprites used through src/assets/manifest.js
  assets/pan_<id>.png                   pan skins (spec 9.1)
  public/                               favicon and app icons
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "assets" / "ref"
SPRITES = ROOT / "src" / "assets" / "sprites"

# group/id: (reference file, crop box, output size, source-pixel scale mode)
SHEET = 305  # cell pitch of the 4-column reference sheets
INGREDIENT_CELLS = {"egg": (0, 0), "bacon": (1, 0), "cheese": (2, 0), "tomato": (3, 0),
                    "mushroom": (1, 1), "onion": (1, 2), "potato": (2, 2), "truffle": (3, 2)}
UI_KIT_ICONS = {"fish": (82, 319, 151, 380), "bread": (320, 319, 386, 380), "herbs": (469, 319, 529, 380)}
CUSTOMER_CELLS = {"office": (0, 0), "calm": (1, 0), "student": (2, 0), "mystery": (3, 0),
                  "old_master": (0, 1), "tourist": (1, 1), "rival_chef": (2, 1), "critic": (3, 1)}
PANS = {"golden": "pan_golden_ref.jpg", "rusty": "pan_rusty_ref.jpg", "pink": "pan_pink_ref.jpg", "black": "pan_black_ref.jpg"}

INGREDIENT_SIZE = 192  # 64 logical px × 3 device px
INGREDIENT_FILL = 0.82  # margin so the recipe glow around a cell stays visible
CUSTOMER_SIZE = 160
PAN_SIZE = 256


def remove_background(img, tolerance=60):
    """Transparent background: flood fill from the border over pixels close to the border colour."""
    rgb = np.asarray(img.convert("RGB")).astype(int)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    close = np.abs(rgb - bg).sum(axis=2) < tolerance
    seen = np.zeros((h, w), bool)
    queue = deque((y, x) for y in range(h) for x in (0, w - 1)) + deque((y, x) for x in range(w) for y in (0, h - 1))
    while queue:
        y, x = queue.popleft()
        if seen[y, x] or not close[y, x]:
            continue
        seen[y, x] = True
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                queue.append((ny, nx))
    # JPEG halo: light pixels touching the background also go.
    halo = np.zeros_like(seen)
    halo[1:] |= seen[:-1]
    halo[:-1] |= seen[1:]
    halo[:, 1:] |= seen[:, :-1]
    halo[:, :-1] |= seen[:, 1:]
    light = np.abs(rgb - bg).sum(axis=2) < tolerance * 2
    alpha = np.where(seen | (halo & light), 0, 255).astype(np.uint8)
    drop_specks(alpha)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(rgba, "RGBA")


def drop_specks(alpha, keep_ratio=0.02):
    """Clears small opaque islands (JPEG noise) left around the sprite."""
    h, w = alpha.shape
    label = np.zeros((h, w), int)
    sizes = [0]
    for y0, x0 in zip(*np.nonzero(alpha)):
        if label[y0, x0]:
            continue
        sizes.append(0)
        n = len(sizes) - 1
        label[y0, x0] = n
        stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            sizes[n] += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n
                    stack.append((ny, nx))
    sizes = np.array(sizes)
    small = sizes < sizes.max() * keep_ratio
    alpha[small[label] & (label > 0)] = 0


def fit(img, size, upscale_nearest=False, fill=0.94):
    """Trims transparent margins and centres the sprite in a size × size square."""
    img = img.crop(img.getbbox())
    scale = (size * fill) / max(img.size)
    resample = Image.NEAREST if upscale_nearest and scale > 1 else Image.LANCZOS
    img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), resample)
    out = Image.new("RGBA", (size, size))
    out.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    return out


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("✓", path.relative_to(ROOT))


def cell(col, row, pitch_y=None):
    y = pitch_y or SHEET
    return (col * SHEET + 4, row * y + 4, (col + 1) * SHEET - 4, (row + 1) * y - 4)


def main():
    ingredients = Image.open(REF / "ingredients_ref.jpg")
    for ing_id, (col, row) in INGREDIENT_CELLS.items():
        crop = ingredients.crop(cell(col, row, ingredients.height // 3))
        save(fit(remove_background(crop), INGREDIENT_SIZE, fill=INGREDIENT_FILL), SPRITES / "ingredients" / f"{ing_id}.png")

    ui_kit = Image.open(REF / "ui_kit_ref.jpg")
    for ing_id, box in UI_KIT_ICONS.items():
        crop = ui_kit.crop(box)
        save(fit(remove_background(crop, tolerance=45), INGREDIENT_SIZE, upscale_nearest=True, fill=INGREDIENT_FILL), SPRITES / "ingredients" / f"{ing_id}.png")

    customers = Image.open(REF / "customers_ref.jpg")
    for customer_id, (col, row) in CUSTOMER_CELLS.items():
        crop = customers.crop(cell(col, row))
        save(fit(remove_background(crop), CUSTOMER_SIZE), SPRITES / "customers" / f"{customer_id}.png")

    for pan_id, name in PANS.items():
        pan = Image.open(REF / name)
        pan = pan.crop((4, 4, pan.width - 4, int(pan.height * 0.78)))  # drop the frame edge and the number
        save(fit(remove_background(pan), PAN_SIZE), ROOT / "assets" / f"pan_{pan_id}.png")

    # Menu art: the loading illustration without its English "Loading..." text and bar.
    loading = Image.open(REF / "loading_ref.jpg")
    scene = loading.crop((0, 0, loading.width, int(loading.height * 0.62)))
    scene = scene.resize((720, round(720 * scene.height / scene.width)), Image.LANCZOS)
    scene.convert("RGB").save(SPRITES / "ui" / "menu_scene.jpg", quality=88)
    print("✓", (SPRITES / "ui" / "menu_scene.jpg").relative_to(ROOT))

    icon = Image.open(REF / "icon_final.png").convert("RGBA")
    for size, name in ((64, "favicon.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
        save(icon.resize((size, size), Image.LANCZOS), ROOT / "public" / name)


if __name__ == "__main__":
    (SPRITES / "ui").mkdir(parents=True, exist_ok=True)
    main()

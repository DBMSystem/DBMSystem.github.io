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
ORIGINALS = REF / "originals"
SPRITES = ROOT / "src" / "assets" / "sprites"

# group/id: (reference file, crop box, output size, source-pixel scale mode)
SHEET = 305  # cell pitch of the 4-column reference sheets
INGREDIENT_CELLS = {"egg": (0, 0), "bacon": (1, 0), "cheese": (2, 0), "tomato": (3, 0),
                    "mushroom": (1, 1), "onion": (1, 2), "potato": (2, 2), "truffle": (3, 2)}
UI_KIT_ICONS = {"fish": (82, 319, 151, 380), "bread": (320, 319, 386, 380), "herbs": (469, 319, 529, 380)}
CUSTOMER_CELLS = {"office": (0, 0), "calm": (1, 0), "student": (2, 0), "mystery": (3, 0),
                  "old_master": (0, 1), "tourist": (1, 1), "rival_chef": (2, 1), "critic": (3, 1)}
# Pip expressions sheet: 4 columns, 2 rows; boxes stop above the English labels.
PIP_ROWS = ((32, 372), (425, 766))
PIP_CELLS = {"happy": (0, 0), "worried": (1, 0), "angry": (2, 0), "thumbs_up": (3, 0),
             "thinking": (0, 1), "neutral": (1, 1), "surprised": (2, 1), "sleeping": (3, 1)}
# Second batch from Daniel (Meta AI): HD ingredients, Brûlée, UI icons and the "mega pack".
HD_INGREDIENTS = {"bread": (74, 678, 517, 1186), "fish": (574, 678, 1326, 1186), "herbs": (1387, 678, 1870, 1186)}
BRULEE = {"happy": (59, 142, 427, 619), "explaining": (507, 142, 954, 619), "laughing": (1001, 142, 1402, 619),
          "sleeping": (1439, 142, 1878, 619), "jealous": (197, 702, 556, 1192), "proud": (806, 702, 1187, 1192),
          "surprised": (1344, 702, 1748, 1192)}
UI_ICONS = {"ad": (0, 0), "rare": (1, 0), "legendary": (2, 0), "coin": (3, 0), "cook": (0, 1), "timer": (2, 1), "recipe": (3, 1)}
UI_ICON_COLS = (106, 579, 1053, 1527)
UI_ICON_ROWS = (54, 534)
UI_ICON_TILE = (369, 350)  # tile width, height
MEGA = {"kitchen_day": (95, 10, 921, 378), "kitchen_night": (976, 10, 1833, 378), "icon": (135, 404, 841, 885)}
# Customers with poses: 3 columns; rows touch each other, so each crop keeps only its main figure.
POSE_COLS = ((1131, 1278), (1336, 1500), (1565, 1721))
POSE_ROWS = ((387, 527), (529, 650), (650, 790), (790, 921))
# Only poses that match the angry faces of the third batch, so each customer is always the same person.
CUSTOMER_POSES = {  # customer: {pose: (col, row)}
    "office": {"idle": (0, 0)},
    "tourist": {"idle": (2, 1), "happy": (1, 1)},
    "calm": {"idle": (0, 2)},
    "student": {"idle": (2, 3), "happy": (1, 3), "arrive": (0, 3)},
}
DISH_COLS = ((49, 214), (228, 394), (408, 574), (588, 753), (768, 933))
DISH_ROWS = ((931, 1045), (1045, 1149), (1149, 1261))
DISHES = {"herb_fish": (0, 0), "mushroom_omelette": (4, 0), "fish_stew": (3, 1), "garden_salad": (4, 1), "garden_skewer": (2, 2)}
# Third batch: 8 dishes (4x2 plates), angry customers (2x2 busts) and the effects sheet.
DISHES_8 = {"bacon_egg": (0, 0), "tomato_toast": (1, 0), "triple_bacon": (2, 0), "cheesy_scramble": (3, 0),
            "bacon_sandwich": (0, 1), "bravas": (1, 1), "spanish_omelette": (2, 1), "fish_chips": (3, 1)}
DISHES_8_COLS = ((37, 489), (528, 980), (1020, 1472), (1511, 1963))
DISHES_8_ROWS = ((46, 488), (519, 962))
ANGRY = {"office": (340, 47, 912, 641), "tourist": (1073, 47, 1598, 641), "calm": (341, 674, 884, 1235), "student": (1056, 674, 1566, 1235)}
VFX = {"sparkle": (56, 55, 520, 563), "hearts": (600, 55, 990, 563), "smoke": (1069, 55, 1561, 563),
       "rainbow": (44, 568, 533, 1059), "coins": (556, 568, 1047, 1059), "star": (1076, 568, 1556, 1059),
       "fire_pan": (52, 1118, 523, 1506)}
VFX_SIZE = 256
PANS = {"golden": "pan_golden_ref.jpg", "rusty": "pan_rusty_ref.jpg", "pink": "pan_pink_ref.jpg", "black": "pan_black_ref.jpg"}

INGREDIENT_SIZE = 192  # 64 logical px × 3 device px
INGREDIENT_FILL = 0.82  # margin so the recipe glow around a cell stays visible
CUSTOMER_SIZE = 160
PIP_SIZE = 192
ICON_SIZE = 96
DISH_SIZE = 160
PAN_SIZE = 256


def remove_background(img, tolerance=60, keep_ratio=0.02):
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
    drop_specks(alpha, keep_ratio)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(rgba, "RGBA")


def drop_specks(alpha, keep_ratio=0.02):
    """Clears opaque islands smaller than keep_ratio × the largest one (JPEG noise, neighbours' edges).
    keep_ratio=1 keeps only the largest island."""
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
    small = sizes < sizes.max() * keep_ratio if keep_ratio < 1 else sizes < sizes.max()
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

    pip = Image.open(REF / "pip_expressions_ref.jpg")
    for expression, (col, row) in PIP_CELLS.items():
        top, bottom = PIP_ROWS[row]
        crop = pip.crop((col * SHEET + 4, top, (col + 1) * SHEET - 4, bottom))
        save(fit(remove_background(crop), PIP_SIZE), SPRITES / "pip" / f"{expression}.png")

    hd = Image.open(ORIGINALS / "18_ingredients_hd.webp")
    for ing_id, box in HD_INGREDIENTS.items():
        save(fit(remove_background(hd.crop(box)), INGREDIENT_SIZE, fill=INGREDIENT_FILL), SPRITES / "ingredients" / f"{ing_id}.png")

    brulee = Image.open(ORIGINALS / "17_brulee_expressions.webp")
    for expression, box in BRULEE.items():
        save(fit(remove_background(brulee.crop(box)), PIP_SIZE), SPRITES / "brulee" / f"{expression}.png")

    icons = Image.open(ORIGINALS / "19_ui_icons.jpg")
    for icon_id, (col, row) in UI_ICONS.items():
        x, y, inset = UI_ICON_COLS[col], UI_ICON_ROWS[row], 22
        crop = icons.crop((x + inset, y + inset, x + UI_ICON_TILE[0] - inset, y + UI_ICON_TILE[1] - inset))
        save(fit(remove_background(crop, tolerance=50), ICON_SIZE), SPRITES / "ui" / f"icon_{icon_id}.png")

    mega = Image.open(ORIGINALS / "20_mega_pack.jpg")
    for name in ("kitchen_day", "kitchen_night"):
        mega.crop(MEGA[name]).convert("RGB").save(SPRITES / "ui" / f"{name}.jpg", quality=90)
        print("✓", f"src/assets/sprites/ui/{name}.jpg")
    icon = fit(remove_background(mega.crop(MEGA["icon"]), tolerance=40), 1024, fill=0.98)
    save(icon, REF / "icon_final.png")
    for customer_id, poses in CUSTOMER_POSES.items():
        for pose, (col, row) in poses.items():
            crop = mega.crop((POSE_COLS[col][0] - 6, POSE_ROWS[row][0], POSE_COLS[col][1] + 6, POSE_ROWS[row][1]))
            sprite = fit(remove_background(crop, tolerance=45, keep_ratio=1), CUSTOMER_SIZE, upscale_nearest=True)
            save(sprite, SPRITES / "customers" / f"{customer_id}_{pose}.png")
    for recipe_id, (col, row) in DISHES.items():
        crop = mega.crop((DISH_COLS[col][0] - 4, DISH_ROWS[row][0], DISH_COLS[col][1] + 4, DISH_ROWS[row][1]))
        save(fit(remove_background(crop, tolerance=40), DISH_SIZE, upscale_nearest=True), SPRITES / "dishes" / f"{recipe_id}.png")

    dishes8 = Image.open(ORIGINALS / "22_dishes_8.jpg")
    for recipe_id, (col, row) in DISHES_8.items():
        crop = dishes8.crop((DISHES_8_COLS[col][0] - 6, DISHES_8_ROWS[row][0] - 6, DISHES_8_COLS[col][1] + 6, DISHES_8_ROWS[row][1] + 6))
        save(fit(remove_background(crop, tolerance=40), DISH_SIZE), SPRITES / "dishes" / f"{recipe_id}.png")

    angry = Image.open(ORIGINALS / "24_customers_angry.webp")
    for customer_id, box in ANGRY.items():
        save(fit(remove_background(angry.crop(box)), CUSTOMER_SIZE), SPRITES / "customers" / f"{customer_id}_angry.png")

    vfx = Image.open(ORIGINALS / "21_vfx_sheet.webp")
    for effect, box in VFX.items():
        save(fit(remove_background(vfx.crop(box), tolerance=30, keep_ratio=0), VFX_SIZE, fill=0.98), SPRITES / "vfx" / f"{effect}.png")

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

    # App icons from the official icon on a cream rounded square (spec palette).
    icon = Image.open(REF / "icon_final.png").convert("RGBA")
    for size, name in ((64, "favicon.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
        tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        radius = size // 5
        mask = Image.new("L", (size, size), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=255)
        tile.paste(Image.new("RGBA", (size, size), (255, 248, 231, 255)), (0, 0), mask)
        art = icon.resize((round(size * 0.92), round(size * 0.92)), Image.LANCZOS)
        tile.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
        save(tile, ROOT / "public" / name)


# ---------- Art generated from the existing sprites (Daniel: "genera tú lo que falta") ----------

PX = 4  # pixel-art block size in the 192 px Pip sprites
EYES = ((79, 92), (114, 92))  # Pip's eye centres in the 192 px sprites


def sprite(key):
    return Image.open(SPRITES / f"{key}.png").convert("RGBA")


def blocks(draw, points, color):
    for x, y in points:
        draw.rectangle((x, y, x + PX - 1, y + PX - 1), fill=color)


def glyph(draw, rows, left, top, color, outline=(59, 42, 32, 255)):
    """Draws a small pixel glyph ('#' = filled) with a dark outline."""
    cells = [(left + c * PX, top + r * PX) for r, row in enumerate(rows) for c, ch in enumerate(row) if ch == "#"]
    for x, y in cells:
        draw.rectangle((x - 2, y - 2, x + PX + 1, y + PX + 1), fill=outline)
    blocks(draw, cells, color)


def drop(draw, x, y, color=(120, 190, 255, 255)):
    glyph(draw, [".#.", "###", "###", ".#."], x, y, color, outline=(40, 90, 160, 255))


def overlay(base, key, scale, x, y):
    art = sprite(key)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    base.alpha_composite(art, (x, y))
    return base


def generate_pip():
    from PIL import ImageDraw
    import random
    rng = random.Random(7)
    out = {}
    img = sprite("pip/happy")
    d = ImageDraw.Draw(img)
    colors = [(255, 112, 67, 255), (255, 213, 79, 255), (167, 139, 250, 255), (102, 187, 106, 255), (79, 195, 247, 255)]
    for _ in range(26):
        x, y = rng.randrange(8, 180), rng.randrange(2, 70)
        if 50 < x < 140 and y > 20:
            continue
        blocks(d, [(x, y)], rng.choice(colors))
    out["celebrating"] = img

    img = sprite("pip/worried")
    d = ImageDraw.Draw(img)
    for x, y in ((40, 60), (150, 70), (30, 100), (158, 110)):
        drop(d, x, y)
    out["scared"] = img

    out["proud"] = overlay(sprite("pip/thumbs_up"), "vfx/sparkle", 0.22, 132, 8)

    img = sprite("pip/neutral")
    glyph(ImageDraw.Draw(img), [".###.", "#...#", "...#.", "..#..", ".....", "..#.."], 146, 30, (255, 213, 79, 255))
    out["confused"] = img

    img = sprite("pip/happy")
    d = ImageDraw.Draw(img)
    for ex, ey in EYES:
        for k in range(4):
            blocks(d, [(ex - 2 + (k % 2) * 2, ey + 6 + k * PX)], (120, 190, 255, 230))
        drop(d, ex - 4, ey + 24)
    out["crying"] = img

    img = sprite("pip/neutral")
    d = ImageDraw.Draw(img)
    ex, ey = EYES[1]
    skin = img.getpixel((ex, ey + 12))
    d.rectangle((ex - 7, ey - 7, ex + 7, ey + 5), fill=skin)
    blocks(d, [(ex - 6, ey - 2), (ex - 2, ey), (ex + 2, ey - 2)], (59, 42, 32, 255))
    out["winking"] = overlay(img, "vfx/star", 0.12, 132, 64)

    img = sprite("pip/neutral")
    d = ImageDraw.Draw(img)
    for ex, ey in EYES:
        d.ellipse((ex - 14, ey + 9, ex + 4, ey + 17), fill=(255, 120, 160, 150))
    drop(d, 146, 64)
    out["embarrassed"] = img

    for name, img in out.items():
        save(img, SPRITES / "pip" / f"{name}.png")


def generate_dishes():
    size = DISH_SIZE
    full = sprite("dishes/bacon_egg")
    overlay(full, "ingredients/bread", 0.32, 88, 78)
    overlay(full, "ingredients/tomato", 0.24, 18, 86)
    save(full, SPRITES / "dishes" / "full_breakfast.png")

    special = sprite("dishes/tomato_toast")
    overlay(special, "ingredients/cheese", 0.36, 52, 30)
    overlay(special, "ingredients/tomato", 0.22, 98, 70)
    save(special, SPRITES / "dishes" / "special_toast.png")
    assert full.size == (size, size)


def generate_happy_poses():
    """Customers without a happy pose: their idle pose with hearts."""
    for customer_id in ("office", "calm"):
        img = sprite(f"customers/{customer_id}_idle")
        save(overlay(img, "vfx/hearts", 0.3, 100, 4), SPRITES / "customers" / f"{customer_id}_happy.png")


# Brûlée's tree: the 9 utensil medallions of the skill tree reference, cut round inside their frames
# (the padlocks and badges stay outside the circle).
UTENSILS = {"runic_counter": (610, 639), "crystal_spatula": (368, 953), "time_ladle": (850, 953),
            "ancient_spice": (249, 1338), "mystic_knife": (610, 1332), "golden_whisk": (964, 1338),
            "enchanted_pot": (260, 1744), "frost_tongs": (610, 1744), "ember_skewers": (959, 1744)}
UTENSIL_RADIUS = 93
UTENSIL_SIZE = 160


def extract_utensils():
    from PIL import ImageDraw, ImageFilter
    tree = Image.open(REF / "skill_tree_ref.jpg").convert("RGBA")
    r = UTENSIL_RADIUS
    mask = Image.new("L", (r * 8, r * 8), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, r * 8 - 1, r * 8 - 1), fill=255)
    mask = mask.resize((r * 2, r * 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    for utensil_id, (x, y) in UTENSILS.items():
        crop = tree.crop((x - r, y - r, x + r, y + r))
        crop.putalpha(mask)
        save(crop.resize((UTENSIL_SIZE, UTENSIL_SIZE), Image.LANCZOS), SPRITES / "utensils" / f"{utensil_id}.png")


if __name__ == "__main__":
    (SPRITES / "ui").mkdir(parents=True, exist_ok=True)
    main()
    generate_pip()
    generate_dishes()
    generate_happy_poses()
    extract_utensils()
    generate_decor()
    generate_phase4_art()


# ---------- Kitchen decoration (spec 5.6), drawn as pixel maps ----------
# Each map is a list of rows; every character is a palette colour ('.' = transparent).
DECOR_PALETTE = {
    "k": (59, 42, 32), "w": (255, 248, 231), "b": (141, 90, 59), "B": (93, 58, 38), "l": (193, 132, 88),
    "t": (205, 110, 70), "T": (160, 80, 50), "g": (102, 187, 106), "G": (46, 125, 50), "y": (255, 213, 79),
    "o": (255, 140, 60), "O": (214, 96, 40), "c": (205, 127, 50), "C": (150, 85, 35), "s": (40, 44, 48),
    "S": (70, 76, 82), "r": (229, 57, 53), "p": (167, 139, 250), "a": (129, 212, 250), "e": (230, 220, 200),
    "n": (190, 160, 120), "m": (120, 85, 60), "h": (255, 236, 179), "v": (240, 98, 146), "q": (200, 200, 200),
}
DECOR_MAPS = {
    "herb_pots": [
        "....g.......g.....",
        "...gGg..g..gGg....",
        "..gGgGg.Gg.gGgg...",
        "...gGg.gGgGgG.....",
        "....G...G..G......",
        ".tttttt...tttttt..",
        ".TtttT....TttttT..",
        "..tttt.....tttt...",
        "..TttT.....TttT...",
        "...TT.......TT....",
    ],
    "garlic_string": [
        "....n....",
        "....n....",
        "...wew...",
        "..wewew..",
        "...wqw...",
        "....n....",
        "...wew...",
        "..wewew..",
        "...wqw...",
        "....n....",
        "...wew...",
        "..wewew..",
        "...wqw...",
        "....n....",
        "...wew...",
        "..wewew..",
        "...wqw...",
        "....n....",
    ],
    "menu_board": [
        "bbbbbbbbbbbbbbbb",
        "bsssssssssssssSb",
        "bswwwwsswwwsssSb",
        "bsssssssssssssSb",
        "bswwsswwwwsssySb",
        "bsssssssssssyysb",
        "bswwwsswwsssssSb",
        "bsssssssssssssSb",
        "bswwsswwwsswwsSb",
        "bsssssssssssssSb",
        "bbbbbbbbbbbbbbbb",
        ".B............B.",
        ".B............B.",
    ],
    "copper_lamp": [
        ".....k.....",
        ".....k.....",
        ".....k.....",
        ".....k.....",
        "....ccc....",
        "...cccCc...",
        "..ccccccC..",
        ".cccccccCC.",
        "cccccccccCC",
        "..hhyyyhh..",
        "...hyyyh...",
        "....hhh....",
    ],
    "spice_rack": [
        ".r..o..y..g..",
        "rrroooyyyggg.",
        "rrroooyyyggg.",
        "bbbbbbbbbbbbb",
        "BBBBBBBBBBBBB",
        ".p..v..a..O..",
        "pppvvvaaaOOO.",
        "pppvvvaaaOOO.",
        "bbbbbbbbbbbbb",
        "BBBBBBBBBBBBB",
    ],
    "wall_clock": [
        "....bbbbb....",
        "..bbwwwwwbb..",
        ".bwwwwkwwwwb.",
        ".bwwwwkwwwwb.",
        "bwkwwwkwwwkwb",
        "bwwwwwkwwwwwb",
        "bwwwwwkkkwwwb",
        "bwkwwwwwwwkwb",
        ".bwwwwwwwwwb.",
        ".bwwwwkwwwwb.",
        "..bbwwwwwbb..",
        "....bbbbb....",
    ],
    "cookie_jar": [
        "...bbbbb...",
        "..bBBBBBb..",
        "..aaaaaaa..",
        ".aawwwwwaa.",
        ".awlmllmwa.",
        ".awllmllwa.",
        ".awmllllwa.",
        ".awllmlmwa.",
        ".awlllmlwa.",
        ".aawwwwwaa.",
        "..aaaaaaa..",
    ],
    "fairy_lights": [
        "k.............................................k",
        ".k....r.............y.............p..........k.",
        "..k..rrr....g......yyy.....a.....ppp....v...k..",
        "...kk.r....ggg..kk..y.....aaa..kk.p....vvv.k...",
        ".....kkk....g.kk..kkk..kk..a.kk..kkkk...vkk....",
        "........kkkkkk........kk..kkk.........kkkk.....",
    ],
    "big_plant": [
        "......g.....g.....",
        "....gGGg..gGGg....",
        "...gGgGGggGGgGg...",
        "..gGgg.GGGG.ggGg..",
        ".gGg..gGGGGg..gGg.",
        ".Gg..gGg.GgGg..gG.",
        "....gG...G..Gg....",
        "........GG........",
        "........G.........",
        "....tttttttttt....",
        "....TttttttttT....",
        ".....tttttttt.....",
        ".....TttttttT.....",
        "......TTTTTT......",
    ],
    "sleeping_cat": [
        "............................",
        "..........................w.",
        ".......................ww...",
        "..o.o.............w.........",
        "..ooo..........oooooo.......",
        ".oookoo......ooooOoooo......",
        ".ooooooo...oooOooooOooo.....",
        ".kooooko..ooooooOooooooo....",
        "..oooooooooOoooooooOoooo....",
        "...ooooooooooooooooooooo....",
        "....ooooooooooooooooooOo.oo.",
        ".....OoooooooooooooooooooOo.",
        "......OOOOOOOOOOOOOOOOOOOO..",
    ],
}
DECOR_SIZE = 192


def generate_decor():
    for decor_id, rows in DECOR_MAPS.items():
        w, h = max(len(r) for r in rows), len(rows)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != ".":
                    img.putpixel((x, y), DECOR_PALETTE[ch] + (255,))
        scale = max(1, DECOR_SIZE // max(w, h))
        img = img.resize((w * scale, h * scale), Image.NEAREST)
        save(img, SPRITES / "decor" / f"{decor_id}.png")


# ---------- Phase 4: special customers and special ingredients ----------
FLAME_MAP = [
    "......y.....",
    ".....yy.....",
    "....yoy..y..",
    "...yoo..yy..",
    "..yooo.yoy..",
    "..yoooyooy..",
    ".yoOoooOooy.",
    ".yoOOoOOooy.",
    "yooOOOOOOooy",
    "yoOOrrrrOOoy",
    "yoOrrhhrrOoy",
    ".yOrhhhhrOy.",
    ".yoOrhhrOoy.",
    "..yoOOOOoy..",
    "...yyyyyy...",
]


def generate_phase4_art():
    import numpy as np
    # Customers without their own art reuse the big portraits kept for special customers (docs/DECISIONES.md).
    save(sprite("customers/student"), SPRITES / "customers" / "collector.png")
    save(sprite("customers/tourist"), SPRITES / "customers" / "night_visitor.png")
    critic = np.array(sprite("customers/critic").convert("RGBA")).astype(float)
    r, g, b = critic[..., 0], critic[..., 1], critic[..., 2]
    purple = (b > r * 0.9) & (b > g * 1.15) & (critic[..., 3] > 0)
    critic[purple, :3] = critic[purple, :3] * 0.35 + 12  # the purple suit turns black
    save(Image.fromarray(critic.clip(0, 255).astype("uint8")), SPRITES / "customers" / "legendary_critic.png")

    # Special ingredients: the kitchen clock icon, the spice medallion and a pixel flame.
    for ing_id, key in (("clock", "ui/icon_timer"), ("spice", "utensils/ancient_spice")):
        save(fit(sprite(key), INGREDIENT_SIZE, fill=INGREDIENT_FILL), SPRITES / "ingredients" / f"{ing_id}.png")
    img = Image.new("RGBA", (len(FLAME_MAP[0]), len(FLAME_MAP)), (0, 0, 0, 0))
    for y, row in enumerate(FLAME_MAP):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), DECOR_PALETTE[ch] + (255,))
    img = img.resize((img.width * 12, img.height * 12), Image.NEAREST)
    save(fit(img, INGREDIENT_SIZE, upscale_nearest=True, fill=INGREDIENT_FILL), SPRITES / "ingredients" / "flame.png")

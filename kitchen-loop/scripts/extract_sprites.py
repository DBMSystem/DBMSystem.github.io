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
from PIL import Image, ImageFilter

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


def generate_happy_poses():
    """Customers without a happy pose: their idle pose with hearts."""
    for customer_id in ("office", "calm"):
        img = sprite(f"customers/{customer_id}_idle")
        save(overlay(img, "vfx/hearts", 0.3, 100, 4), SPRITES / "customers" / f"{customer_id}_happy.png")


# Special and legendary customers only have their full-body portrait: their happy and angry poses are that same
# portrait (always the same person) with hearts, or flushed red with puffs of steam (the game draws the animated
# anger mark on top, as for the others).
SPECIAL_CUSTOMERS = ("critic", "rival_chef", "mystery", "collector", "old_master", "legendary_critic", "night_visitor")
STEAM_PUFF = [".##..", "####.", "#####", ".###."]


def generate_special_poses():
    from PIL import ImageDraw
    for customer_id in SPECIAL_CUSTOMERS:
        portrait = sprite(f"customers/{customer_id}")
        save(overlay(portrait.copy(), "vfx/hearts", 0.3, 100, 4), SPRITES / "customers" / f"{customer_id}_happy.png")
        px = np.array(portrait).astype(float)
        px[..., 1] *= 0.82
        px[..., 2] *= 0.82
        angry = Image.fromarray(px.clip(0, 255).astype(np.uint8), "RGBA")
        top = portrait.getbbox()[1]
        draw = ImageDraw.Draw(angry)
        for x, y in ((22, top + 4), (8, top + 22), (116, top + 4), (132, top + 22)):
            glyph(draw, STEAM_PUFF, x, y, (245, 245, 245, 255), outline=(150, 150, 160, 255))
        save(angry, SPRITES / "customers" / f"{customer_id}_angry.png")


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
    generate_happy_poses()
    generate_special_poses()
    extract_utensils()
    extract_decor()
    generate_phase4_art()
    generate_dish_art()
    write_visual_scales()
    boost_poses()
    generate_default_pan()


# ---------- Kitchen decoration (spec 5.6), cut out of the day kitchen of the mega pack ----------
# Same pixel art as the rest of the game (Daniel: coherent universe). Boxes in the mega pack; `erase` are
# boxes (relative to the crop) with leftovers of the scene to clear.
DECOR_CROPS = {
    "pendant_lamp": ((475, 21, 531, 73), []),
    "garlic_string": ((411, 114, 547, 171), []),
    "jar_shelf": ((262, 103, 398, 163), []),
    "plant_shelf": ((407, 65, 565, 118), []),
    "fruit_bowl": ((335, 168, 413, 229), []),
    "herb_pot": ((294, 169, 334, 233), []),
    "window_plant": ((727, 152, 777, 206), []),
    "big_plant": ((855, 182, 920, 259), []),
    "cutting_board": ((109, 177, 191, 260), [(36, 0, 54, 21), (54, 0, 82, 47)]),
    "veggie_bag": ((508, 173, 562, 233), []),
}
DECOR_SCALE = 3  # nearest-neighbour, keeps the pixels crisp


def outline_cut(img, dark=80, step=38):
    """Background removal for objects cut out of a scene: flood from the border through light pixels that
    change little from their neighbour, stopping at the dark pixel-art outlines. Keeps the largest island."""
    rgb = np.asarray(img.convert("RGB")).astype(int)
    h, w, _ = rgb.shape
    passable = rgb @ np.array([0.3, 0.59, 0.11]) > dark
    seen = np.zeros((h, w), bool)
    queue = deque()
    for y, x in [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]:
        if passable[y, x] and not seen[y, x]:
            seen[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and passable[ny, nx] and np.abs(rgb[ny, nx] - rgb[y, x]).sum() < step:
                seen[ny, nx] = True
                queue.append((ny, nx))
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    drop_specks(alpha, 1)
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")


def extract_decor():
    mega = Image.open(ORIGINALS / "20_mega_pack.jpg").convert("RGB")
    for decor_id, (box, erase) in DECOR_CROPS.items():
        crop = mega.crop(box)
        for x0, y0, x1, y1 in erase:
            crop.paste((0, 0, 0), (x0, y0, x1, y1))  # dark = never flooded, so clear it after the cut
        img = outline_cut(crop)
        alpha = img.getchannel("A")
        for x0, y0, x1, y1 in erase:
            alpha.paste(0, (x0, y0, x1, y1))
        img.putalpha(alpha)
        img = img.crop(img.getbbox())
        save(img.resize((img.width * DECOR_SCALE, img.height * DECOR_SCALE), Image.NEAREST), SPRITES / "decor" / f"{decor_id}.png")


# ---------- Phase 4: special customers and special ingredients ----------
def draw_flame(w=40, h=48):
    """A flame in the game's pixel-art style: dark outline, three shades and a light core (Daniel: design new art
    yourself, same style). Built from a teardrop and two side tongues, at the ingredients' pixel density."""
    import math
    cx, cy, r, top = w * 0.5, h * 0.66, w * 0.4, h * 0.04
    fx, fy = cx, h * 0.8  # inner layers shrink towards the flame's base

    def base(x, y):
        if y >= cy:
            return (x - cx) ** 2 + (y - cy) ** 2 < r * r
        if y < top:
            return False
        t = (y - top) / (cy - top)
        centre = cx + (1 - t) * w * 0.12 + math.sin(t * 7) * w * 0.02  # the tip leans and waves
        tongues = any(((x - tx) / (w * 0.09)) ** 2 + ((y - ty) / (h * 0.14)) ** 2 < 1 for tx, ty in ((w * 0.2, h * 0.5), (w * 0.8, h * 0.44)))
        return abs(x - centre) < r * t ** 0.75 or tongues

    def inside(x, y, shrink=0.0):
        return base(fx + (x - fx) / (1 - shrink), fy + (y - fy) / (1 - shrink))

    colors = [(66, 26, 20), (229, 57, 53), (255, 112, 40), (255, 190, 60), (255, 244, 190)]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if not inside(x + 0.5, y + 0.5):
                continue
            level = 1 + sum(inside(x + 0.5, y + 0.5, s) for s in (0.25, 0.5, 0.72))
            img.putpixel((x, y), colors[level] + (255,))
    # dark outline around the shape
    alpha = np.asarray(img.getchannel("A")) > 0
    edge = np.zeros_like(alpha)
    edge[1:] |= alpha[:-1]; edge[:-1] |= alpha[1:]; edge[:, 1:] |= alpha[:, :-1]; edge[:, :-1] |= alpha[:, 1:]
    for y, x in zip(*np.nonzero(edge & ~alpha)):
        img.putpixel((int(x), int(y)), colors[0] + (255,))
    return img


def draw_potato(w=44, h=34):
    """A potato in the ingredients' pixel-art style (the reference one looked like a sausage): lumpy oval,
    dark outline, light from the top left, shadow at the bottom and a few eyes."""
    import math
    colours = {"outline": (74, 46, 26), "shadow": (158, 102, 52), "base": (200, 144, 82), "light": (228, 184, 118), "shine": (244, 214, 160), "eye": (122, 78, 40)}
    cx, cy, rx, ry = w / 2, h / 2, w * 0.46, h * 0.42
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    inside = lambda x, y: ((x - cx) / (rx * (1 + 0.05 * math.sin(3 * math.atan2(y - cy, x - cx))))) ** 2 + ((y - cy) / ry) ** 2 < 1
    for y in range(h):
        for x in range(w):
            if not inside(x + 0.5, y + 0.5):
                continue
            light = ((cx - x) / rx * 0.5 + (cy - y) / ry * 0.8)
            tone = "shine" if light > 0.75 else "light" if light > 0.25 else "shadow" if light < -0.55 else "base"
            img.putpixel((x, y), colours[tone] + (255,))
    for ex, ey in ((0.3, 0.45), (0.62, 0.35), (0.72, 0.62), (0.45, 0.7)):
        x, y = round(w * ex), round(h * ey)
        img.putpixel((x, y), colours["eye"] + (255,))
        img.putpixel((x + 1, y), colours["shadow"] + (255,))
    alpha = np.asarray(img.getchannel("A")) > 0
    edge = np.zeros_like(alpha)
    edge[1:] |= alpha[:-1]; edge[:-1] |= alpha[1:]; edge[:, 1:] |= alpha[:, :-1]; edge[:, :-1] |= alpha[:, 1:]
    for y, x in zip(*np.nonzero(edge & ~alpha)):
        img.putpixel((int(x), int(y)), colours["outline"] + (255,))
    return img


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
    save(fit(sprite("ui/icon_timer"), INGREDIENT_SIZE, fill=INGREDIENT_FILL), SPRITES / "ingredients" / "clock.png")
    potato = draw_potato()
    save(fit(potato.resize((potato.width * 4, potato.height * 4), Image.NEAREST), INGREDIENT_SIZE, upscale_nearest=True, fill=INGREDIENT_FILL), SPRITES / "ingredients" / "potato.png")
    # The spice jar, cut out of its medallion: everything outside the frame becomes light background first.
    from PIL import ImageDraw
    x, y = UTENSILS["ancient_spice"]
    r = UTENSIL_RADIUS - 6
    jar = Image.open(REF / "skill_tree_ref.jpg").convert("RGB").crop((x - r, y - r, x + r, y + r))
    outside = Image.new("L", jar.size, 255)
    ImageDraw.Draw(outside).ellipse((0, 0, 2 * r - 1, 2 * r - 1), fill=0)
    jar.paste((245, 235, 215), (0, 0), outside)
    spice = outline_cut(jar, dark=55, step=45)
    alpha = spice.getchannel("A")
    alpha.paste(0, (round(r * 1.62), round(r * 1.05), 2 * r, 2 * r))  # the vines that the frame cuts off
    spice.putalpha(alpha)
    save(fit(spice, INGREDIENT_SIZE, fill=INGREDIENT_FILL), SPRITES / "ingredients" / "spice.png")
    img = draw_flame()
    img = img.resize((img.width * 4, img.height * 4), Image.NEAREST)
    save(fit(img, INGREDIENT_SIZE, upscale_nearest=True, fill=INGREDIENT_FILL), SPRITES / "ingredients" / "flame.png")


# ---------- Consistent sizes (Daniel: "ten en cuenta los tamaños… para que sea coherente") ----------
# Round and long objects must look equally big. The art itself is never resampled again (Daniel liked the
# original pixels): the script only measures each sprite and writes a draw scale to src/assets/spriteScales.json,
# so the square root of the content area becomes `target` of the box and the longest side stays under `max_side`.
VISUAL_SIZE = {"ingredients": (0.74, 0.92), "dishes": (0.80, 0.96)}
# Customer poses drawn smaller in the reference (their props made them fit a square): scale up and widen
# the canvas so every customer's head is about the same size. Height stays CUSTOMER_SIZE.
POSE_BOOST = {"tourist_idle": 1.3, "tourist_happy": 1.3}


def write_visual_scales():
    import json
    scales = {}
    for group, (target, max_side) in VISUAL_SIZE.items():
        for path in sorted((SPRITES / group).glob("*.png")):
            img = Image.open(path).convert("RGBA")
            box = img.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
            w, h = (box[2] - box[0]) / img.width, (box[3] - box[1]) / img.height
            scale = min(target / (w * h) ** 0.5, max_side / max(w, h))
            if abs(scale - 1) > 0.02:
                scales[f"{group}/{path.stem}"] = round(scale, 3)
    out = ROOT / "src" / "assets" / "spriteScales.json"
    out.write_text(json.dumps(scales, indent=2, sort_keys=True) + "\n")
    print("✓", out.relative_to(ROOT))


def boost_poses():
    for name, boost in POSE_BOOST.items():
        path = SPRITES / "customers" / f"{name}.png"
        img = Image.open(path).convert("RGBA")
        content = img.crop(img.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox())
        content = content.resize((round(content.width * boost), round(content.height * boost)), Image.LANCZOS)
        height = CUSTOMER_SIZE
        width = max(height, content.width + 8)
        out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        out.paste(content, ((width - content.width) // 2, height - content.height - round(height * 0.03)), content)
        save(out, path)


# ---------- Dishes of utensil and secret recipes, made from the same dish art ----------
def hue_shift(img, degrees):
    hsv = np.asarray(img.convert("RGB").convert("HSV")).copy()
    hsv[..., 0] = (hsv[..., 0].astype(int) + round(degrees * 255 / 360)) % 256
    out = Image.fromarray(hsv, "HSV").convert("RGBA")
    out.putalpha(img.getchannel("A"))
    return out


# ---------- Toppings painted into the dish art (Daniel: tomato and cheese spread on the bread, not stuck on) ----------
# The dish sheets are AI pixel art with ~7 source pixels per art pixel: toppings are painted on that grid.
BLOCK = 7
TOMATO = ((206, 58, 46), (232, 92, 70), (160, 36, 30), (244, 132, 98))  # base, light, seeds, highlight
CHEESE = ((255, 212, 78), (255, 236, 150), (226, 168, 44), (190, 118, 24))  # base, light, holes, rim


def dishes8_cell(name):
    col, row = DISHES_8[name]
    sheet = Image.open(ORIGINALS / "22_dishes_8.jpg").convert("RGB")
    return sheet.crop((DISHES_8_COLS[col][0] - 6, DISHES_8_ROWS[row][0] - 6, DISHES_8_COLS[col][1] + 6, DISHES_8_ROWS[row][1] + 6))


def bread_faces(img):
    """Block mask of the toasts' crumb (inside the crust): light bread colours, holes closed, crust kept."""
    import colorsys
    rgb = np.asarray(img).astype(float) / 255
    hsv = np.vectorize(colorsys.rgb_to_hsv)(rgb[..., 0], rgb[..., 1], rgb[..., 2])
    face = (hsv[0] * 360 > 22) & (hsv[0] * 360 < 48) & (hsv[1] > 0.2) & (hsv[2] > 0.78)
    mask = Image.fromarray((face * 255).astype("uint8"))
    mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))  # close the crumb speckles
    mask = mask.filter(ImageFilter.MinFilter(2 * BLOCK + 1))  # keep a crust border
    m = np.asarray(mask) > 0
    rows, cols = m.shape[0] // BLOCK, m.shape[1] // BLOCK
    return np.array([[m[r * BLOCK:(r + 1) * BLOCK, c * BLOCK:(c + 1) * BLOCK].mean() > 0.6 for c in range(cols)] for r in range(rows)])


def block_components(blocks):
    """Connected groups of blocks (one per toast), as lists of (row, col)."""
    seen, groups = set(), []
    for start in zip(*np.nonzero(blocks)):
        if start in seen:
            continue
        group, stack = [], [start]
        seen.add(start)
        while stack:
            r, c = stack.pop()
            group.append((r, c))
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < blocks.shape[0] and 0 <= nc < blocks.shape[1] and blocks[nr, nc] and (nr, nc) not in seen:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
        groups.append(group)
    return [g for g in groups if len(g) > 20]


def paint_blocks(img, cells, colour_of):
    px = img.load()
    for r, c in cells:
        colour = colour_of(r, c)
        if colour is None:
            continue
        for y in range(r * BLOCK, (r + 1) * BLOCK):
            for x in range(c * BLOCK, (c + 1) * BLOCK):
                px[x, y] = colour


def spread_tomato(img, toasts, rng):
    """Grated tomato over each toast: irregular edge, lighter bits and a few seeds."""
    for group in toasts:
        cells = set(group)
        edge = {cell for cell in cells if any(n not in cells for n in ((cell[0] + 1, cell[1]), (cell[0] - 1, cell[1]), (cell[0], cell[1] + 1), (cell[0], cell[1] - 1)))}
        def colour(r, c):
            if (r, c) in edge and rng.random() < 0.45:
                return None  # bread shows at the edge
            roll = rng.random()
            return TOMATO[2] if roll < 0.1 else TOMATO[1] if roll < 0.35 else TOMATO[3] if roll < 0.42 else TOMATO[0]
        paint_blocks(img, group, colour)


def melt_cheese(img, toasts, rng):
    """A slice of melted cheese on each toast, slightly slanted, with a darker rim and a few holes."""
    for group in toasts:
        rows = [r for r, _ in group]
        cols = [c for _, c in group]
        top, bottom, left, right = min(rows), max(rows), min(cols), max(cols)
        height = bottom - top
        width = right - left
        slice_ = {
            (r, c)
            for r, c in group
            if top + 0.1 * height + (c - left) * 0.15 <= r <= top + 0.6 * height + (c - left) * 0.15 and left + 0.12 * width <= c <= right - 0.1 * width
        }
        rim = {cell for cell in slice_ if any(n not in slice_ for n in ((cell[0] + 1, cell[1]), (cell[0] - 1, cell[1]), (cell[0], cell[1] + 1), (cell[0], cell[1] - 1)))}
        def colour(r, c):
            if (r, c) in rim:
                return CHEESE[3]
            roll = rng.random()
            return CHEESE[2] if roll < 0.07 else CHEESE[1] if roll < 0.3 else CHEESE[0]
        paint_blocks(img, sorted(slice_), colour)


def painted_toasts(cheese=False, seed=7):
    import random
    rng = random.Random(seed)
    img = dishes8_cell("tomato_toast")
    toasts = block_components(bread_faces(img))
    spread_tomato(img, toasts, rng)
    if cheese:
        melt_cheese(img, toasts, rng)
    return img


def recolour(img, select, palette):
    """Repaints the pixels chosen by select(h, s, v) with a palette by brightness (dark → light), keeping shading."""
    import colorsys
    rgb = np.asarray(img.convert("RGB")).astype(float) / 255
    out = np.asarray(img.convert("RGBA")).copy()
    for y in range(rgb.shape[0]):
        for x in range(rgb.shape[1]):
            h, s, v = colorsys.rgb_to_hsv(*rgb[y, x])
            if select(h * 360, s, v):
                out[y, x, :3] = palette[min(len(palette) - 1, int(v * len(palette)))]
    return Image.fromarray(out, "RGBA").copy()


def cut_out(img, box):
    """An object of the dish art, cut along its dark outline (the plate around it goes)."""
    return outline_cut(img.crop(box)).crop(outline_cut(img.crop(box)).getbbox())


def glints(img, spots, block=2):
    """Small pixel-art sparkles (white core, gold arms) instead of a big pasted effect."""
    px = img.load()
    gold, white = (255, 213, 79, 255), (255, 255, 240, 255)
    for cx, cy, arm in spots:
        for k in range(-arm, arm + 1):
            for dx, dy in ((k, 0), (0, k)):
                colour = white if k == 0 else gold
                for yy in range(block):
                    for xx in range(block):
                        x, y = cx + dx * block + xx, cy + dy * block + yy
                        if 0 <= x < img.width and 0 <= y < img.height:
                            px[x, y] = colour
    return img


def generate_dish_art():
    """Dishes whose recipe needs toppings or a special touch, all painted in the dishes' own pixel art."""
    import random
    dishes = SPRITES / "dishes"
    plate = lambda img: fit(remove_background(img, tolerance=40), DISH_SIZE)
    plain = lambda img: fit(img, DISH_SIZE)

    tomato_toast = painted_toasts(cheese=False)
    save(plate(tomato_toast), dishes / "tomato_toast.png")
    special = painted_toasts(cheese=True)
    save(plate(special), dishes / "special_toast.png")

    # Desayuno Completo: bacon and egg with a toast with tomato, all from the same sheet (same pixel size).
    breakfast = dishes8_cell("bacon_egg").convert("RGBA")
    slice_ = cut_out(tomato_toast, (40, 120, 238, 372))
    slice_ = slice_.resize((round(slice_.width * 0.8), round(slice_.height * 0.8)), Image.NEAREST)
    breakfast.alpha_composite(slice_, (236, 250))
    save(plate(breakfast.convert("RGB")), dishes / "full_breakfast.png")

    # Huevos Rotos: the bravas' potatoes without sauce, an egg broken on top and a strip of bacon.
    egg = cut_out(dishes8_cell("bacon_egg"), (236, 150, 456, 380))
    bacon = cut_out(dishes8_cell("bacon_egg"), (40, 80, 250, 410))
    potatoes = recolour(dishes8_cell("bravas"), lambda h, s, v: (h < 18 or h > 330) and s > 0.35, [(160, 104, 48), (196, 140, 70), (226, 176, 96), (244, 206, 130)])
    potatoes.alpha_composite(bacon.resize((round(bacon.width * 0.55), round(bacon.height * 0.55)), Image.NEAREST), (70, 170))
    potatoes.alpha_composite(egg.resize((round(egg.width * 0.8), round(egg.height * 0.8)), Image.NEAREST), (160, 130))
    save(plate(potatoes.convert("RGB")), dishes / "broken_eggs.png")

    mega = Image.open(ORIGINALS / "20_mega_pack.jpg").convert("RGB")
    mega_dish = lambda col, row: mega.crop((DISH_COLS[col][0] - 4, DISH_ROWS[row][0], DISH_COLS[col][1] + 4, DISH_ROWS[row][1]))
    # Crema de Champiñones: the noodle bowl turned into a cream with mushroom pieces.
    cream = recolour(mega_dish(1, 0), lambda h, s, v: 25 <= h <= 60 and s > 0.3 and v > 0.45, [(196, 160, 118), (222, 192, 150), (238, 214, 178), (250, 234, 206)])
    cream = recolour(cream, lambda h, s, v: (h < 18 or h > 330) and s > 0.4, [(96, 64, 40), (128, 88, 56), (158, 114, 76), (184, 142, 102)])
    save(fit(remove_background(cream, tolerance=40), DISH_SIZE, upscale_nearest=True), dishes / "mushroom_cream.png")

    # Tortilla Francesa: the rolled omelette without its mushrooms (its left half, mirrored).
    omelette = fit(remove_background(mega_dish(4, 0), tolerance=40), DISH_SIZE, upscale_nearest=True)
    half = omelette.crop((0, 0, DISH_SIZE // 2, DISH_SIZE))
    french = Image.new("RGBA", (DISH_SIZE, DISH_SIZE))
    french.paste(half, (0, 0))
    french.paste(half.transpose(Image.FLIP_LEFT_RIGHT), (DISH_SIZE // 2, 0))
    save(french, dishes / "french_omelette.png")

    # Secret dishes: a known dish with a touch of magic, marked with small pixel sparkles.
    crown = overlay(sprite("dishes/triple_bacon"), "ui/icon_legendary", 0.5, 56, 8)
    save(glints(crown, [(28, 30, 2), (132, 40, 2), (120, 118, 1)]), dishes / "bacon_crown.png")
    impossible = recolour(french.copy(), lambda h, s, v: 35 <= h <= 60 and s > 0.55, [(214, 150, 20), (240, 186, 40), (255, 214, 70), (255, 236, 130)])
    save(glints(impossible, [(40, 50, 2), (124, 44, 2), (84, 34, 1)]), dishes / "impossible_omelette.png")
    save(glints(hue_shift(sprite("dishes/cheesy_scramble"), 235), [(34, 34, 2), (126, 40, 2), (116, 122, 1)]), dishes / "mystic_scramble.png")
    soup = recolour(sprite("dishes/fish_stew"), lambda h, s, v: 30 <= h <= 70 and s > 0.25 and v > 0.5, [(200, 150, 40), (226, 180, 60), (246, 206, 90), (255, 230, 140)])
    save(glints(soup, [(40, 36, 2), (122, 38, 2), (82, 30, 1)]), dishes / "master_soup.png")

    # Tomate Explosivo: a tomato on fire on an empty plate (the scramble plate, emptied).
    empty = recolour(dishes8_cell("cheesy_scramble"), lambda h, s, v: 20 <= h <= 65 and s > 0.2, [(236, 236, 236), (242, 242, 242), (246, 246, 246), (250, 250, 250)])
    empty = plate(empty)
    overlay(empty, "ingredients/tomato", 0.6, 22, 30)
    overlay(empty, "ingredients/flame", 0.32, 70, 6)
    save(glints(empty, [(26, 40, 2), (134, 60, 2)]), dishes / "exploding_tomato.png")

    # La Receta Perdida: toast with cheese, an egg and truffle shavings.
    rng = random.Random(3)
    lost = painted_toasts(cheese=True, seed=11).convert("RGBA")
    lost.alpha_composite(egg.resize((round(egg.width * 0.75), round(egg.height * 0.75)), Image.NEAREST), (150, 150))
    shavings = [(rng.randrange(80, 380), rng.randrange(150, 330)) for _ in range(14)]
    paint_blocks(lost, [(y // BLOCK, x // BLOCK) for x, y in shavings], lambda r, c: (92, 62, 44, 255))
    save(glints(plate(lost.convert("RGB")), [(30, 34, 2), (130, 36, 2), (82, 22, 1)]), dishes / "lost_recipe.png")


def generate_default_pan():
    """Pip's own pan, in the same style and top-down view as the designed ones: the black pan turned into clean
    steel (so it never looks like the paid black one). The designed pans in assets/ are never modified."""
    black = np.asarray(Image.open(ROOT / "assets" / "pan_black.png").convert("RGBA")).astype(float)
    lum = black[..., :3] @ np.array([0.3, 0.59, 0.11])
    steel = np.clip(70 + lum * 1.55, 0, 255)
    out = black.copy()
    out[..., 0], out[..., 1], out[..., 2] = steel * 0.95, steel * 0.98, np.clip(steel * 1.06, 0, 255)
    save(Image.fromarray(out.astype("uint8"), "RGBA"), SPRITES / "pans" / "default.png")

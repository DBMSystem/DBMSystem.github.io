"""The kitchen behind the story scenes: the same pixel art as the kitchen in play (Daniel: "que sea el estilo pixel
art que cuando estás en partida en la cocina"), with the string of peppers and garlic under the shelf replaced by
hanging kitchen utensils ("en vez de pimientos de colores, utensilios de cocina, como una paleta, un cazo, unas
pinzas…").

Dev tool, not part of the game: `python3 scripts/story_backdrop.py` (needs Pillow + numpy).
Reads src/assets/sprites/ui/kitchen_day.jpg and kitchen_night.jpg (never modified) and writes ui/scene_day.png and
ui/scene_night.png at the same size: the story screens show them at about the scale the game does.
"""
from pathlib import Path

import numpy as np
from PIL import Image

from card_art import pattern, with_outline, shape

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "src" / "assets" / "sprites" / "ui"
B = 2  # the kitchen's pixel block, in image pixels

# Where the peppers hang in each kitchen: the areas to clear (x0, y0, x1, y1; the garlic hangs lower than the
# peppers, the carrot leaves below them stay) and the rail's hooks.
RAILS = {
    "day": {"clear": ((308, 115, 410, 174), (400, 115, 454, 165)), "hooks": (335, 362, 390, 418, 443), "top": 113},
    "night": {"clear": ((328, 116, 432, 175), (422, 116, 474, 166)), "hooks": (352, 380, 408, 436, 462), "top": 114},
}

SPATULA = ["..tTt..", "..tkt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..", "..tTt..",
           ".ttttt.", "tttTttt", "tTtTtTt", "tTtTtTt", "tTtTtTt", "tTtTtTt", "ttttttt", ".ttttt."]
LADLE = ["...ss...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...", "...sS...",
         "...sS...", "..ssSS..", ".sSSSSs.", "sSSSSSSs", "sSSSSSSs", "ssSSSSss", ".ssssss.", "..ssss.."]
TONGS = ["..sss..", ".s...s.", ".s...s.", "..sss..", "..s.s..", "..s.s..", "..s.s..", ".s...s.", ".s...s.", ".s...s.", ".s...s.",
         "s.....s", "s.....s", "s.....s", "S.....S", "SS...SS"]
WHISK_HANDLE = ["..rr..", "..rR..", "..rR..", "..rR..", "..rR..", "..rR..", "..rR..", "..SS.."]


def saucepan():
    handle = pattern(["..NN..", "..kN..", "..NN..", "..NN..", "..NN..", "..NN..", "..NN..", "..NN.."], outline=False, p=B)
    pan = shape(lambda u, v: u * u + v * v < 1, 11, 11,
                lambda u, v: "Y" if (u + 0.4) ** 2 + (v + 0.4) ** 2 < 0.05 else "o" if u * u + v * v > 0.55 else "O", outline=False, p=B)
    out = Image.new("RGBA", (pan.width, handle.height + pan.height - B))
    out.alpha_composite(handle, ((pan.width - handle.width) // 2, 0))
    out.alpha_composite(pan, (0, handle.height - B))
    return out


def whisk():
    handle = pattern(WHISK_HANDLE, outline=False, p=B)
    loops = shape(lambda u, v: 0.55 < (u * u) / (0.35 + 0.65 * (v + 1) / 2) ** 2 + v * v < 1 or (abs(u) < 0.12 and v > -0.6), 9, 14,
                  lambda u, v: "s" if u < 0.2 else "S", outline=False, p=B)
    out = Image.new("RGBA", (loops.width, handle.height + loops.height - B))
    out.alpha_composite(handle, ((loops.width - handle.width) // 2, 0))
    out.alpha_composite(loops, (0, handle.height - B))
    return out


def utensils():
    """Spatula, ladle, saucepan, tongs and whisk, outlined like the kitchen's own pixel art."""
    pieces = [pattern(SPATULA, outline=False, p=B), pattern(LADLE, outline=False, p=B), saucepan(), pattern(TONGS, outline=False, p=B), whisk()]
    return [with_outline(p, width=2) for p in pieces]


def clear(img, box):
    """Paints the wall back where the peppers hung: each row blends the wall just left and right of the area, the
    rows are smoothed together (no streaks) and the edges fade into the original so there is no visible patch."""
    a = np.asarray(img).astype(float)
    x0, y0, x1, y1 = box
    fill = np.zeros((y1 - y0, x1 - x0, 3))
    t = np.linspace(0, 1, x1 - x0)[:, None]
    ref = np.median(np.concatenate([a[y0:y1, x0 - 4:x0 - 1], a[y0:y1, x1 + 1:x1 + 4]]).reshape(-1, 3), axis=0)
    wall = lambda c: np.linalg.norm(c - ref) < 40  # close to the wall's own colour: not a leaf, a fruit or a pepper
    last = None
    for y in range(y0, y1):
        left = a[y - 1:y + 2, x0 - 4:x0 - 1].reshape(-1, 3).mean(axis=0)
        right = a[y - 1:y + 2, x1 + 1:x1 + 4].reshape(-1, 3).mean(axis=0)
        if last is not None and not (wall(left) and wall(right)):
            fill[y - y0] = last  # something in front of the wall at this row: carry the wall down
            continue
        fill[y - y0] = left * (1 - t) + right * t
        last = fill[y - y0].copy()
    kernel = np.ones(5) / 5
    for c in range(3):  # smooth along the columns
        fill[..., c] = np.apply_along_axis(lambda col: np.convolve(np.pad(col, 2, mode="edge"), kernel, mode="valid"), 0, fill[..., c])
    rng = np.random.default_rng(1)
    fill += rng.normal(0, 1.6, fill.shape)  # the wall's own grain
    yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0]
    edge = np.minimum.reduce([xx, x1 - x0 - 1 - xx, yy, y1 - y0 - 1 - yy]).astype(float)
    k = np.clip(edge / 4, 0, 1)[..., None]  # 4 px feather into the original
    a[y0:y1, x0:x1] = fill * k + a[y0:y1, x0:x1] * (1 - k)
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"), img.mode)


def scene(kitchen, rail):
    img = Image.open(UI / f"kitchen_{kitchen}.jpg").convert("RGB")
    for area in rail["clear"]:
        img = clear(img, area)
    out = img.convert("RGBA")
    pieces = utensils()
    if kitchen == "night":  # the night kitchen's dim, bluish light on the new utensils too
        pieces = [Image.fromarray(np.concatenate([np.asarray(p)[..., :3] * np.array([0.78, 0.76, 0.9]), np.asarray(p)[..., 3:]], axis=2).astype("uint8"), "RGBA")
                  for p in pieces]
    for x, art in zip(rail["hooks"], pieces):
        left = x - art.width // 2
        shadow = Image.new("RGBA", art.size, (0, 0, 0, 0))
        shadow.putalpha(art.getchannel("A").point(lambda v: 70 if v else 0))
        out.alpha_composite(shadow, (left + 2, rail["top"] + 2))
        out.alpha_composite(art, (left, rail["top"]))
    return out.convert("RGB")


def main():
    for kitchen, rail in RAILS.items():
        for old in UI.glob(f"scene_{kitchen}.*"):
            old.unlink()
        path = UI / f"scene_{kitchen}.png"
        scene(kitchen, rail).save(path, optimize=True)
        print("✓", path.relative_to(ROOT), f"{path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

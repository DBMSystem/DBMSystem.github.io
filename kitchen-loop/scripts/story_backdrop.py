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
    "day": {"clear": ((308, 115, 410, 178), (400, 115, 458, 168)), "hooks": (335, 362, 390, 418, 443), "top": 113},
    "night": {"clear": ((328, 116, 432, 175), (422, 116, 474, 166)), "hooks": (352, 380, 408, 436, 462), "top": 114, "whole": True},
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


def dilate(mask, r):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def clear(img, boxes, whole=False):
    """Paints the wall back where the peppers and garlic hung: their own pixels (anything far from the wall's colour,
    with outline and drop shadow), or the whole area when the wall around is too busy to tell (the night kitchen's
    string of lights). The gap is filled by diffusing the wall around it, so the lamps' light and glow carry through,
    but only from wall: the rail, the leaves and the outlines never bleed in (no smear, no flat band). Then the wall's
    own grain."""
    a = np.asarray(img).astype(float)
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    mid = (y0 + y1) // 2  # the upper half: below it, leaves and fruit reach the sides
    strips = np.concatenate([a[y0:mid, x0 - 6:x0], a[y0:mid, x1:x1 + 6]], axis=1).reshape(-1, 3)
    luma = strips.sum(axis=1)
    wall = np.median(strips[luma <= np.median(luma)], axis=0)  # the plain wall, not a bulb or its glow
    inside = np.zeros(a.shape[:2], bool)
    for bx0, by0, bx1, by1 in boxes:
        inside[by0:by1, bx0:bx1] = True
    far = np.linalg.norm(a - wall, axis=2) > 35
    mask = inside if whole else dilate(far & inside, 3) & inside
    # work on the area plus a margin; outside the hole only wall-like pixels count as neighbours
    m = 16
    sy, sx = slice(y0 - m, y1 + m), slice(x0 - m, x1 + m)
    hole, fill = mask[sy, sx], a[sy, sx].copy()
    lum = a[sy, sx].sum(axis=2)
    usable = hole | (~far[sy, sx] | ((lum > wall.sum()) & (np.abs(a[sy, sx] - a[sy, sx].mean(axis=2, keepdims=True)).max(axis=2) < 60)))
    w = usable.astype(float)
    fill[hole] = wall
    shifts = ((1, 0), (-1, 0), (1, 1), (-1, 1))
    for _ in range(3000):
        total = sum(np.roll(fill * w[..., None], k, axis) for k, axis in shifts)
        count = sum(np.roll(w, k, axis) for k, axis in shifts)
        avg = total / np.maximum(count, 1)[..., None]
        fill[hole] = avg[hole]
    rng = np.random.default_rng(1)
    fill[hole] += rng.normal(0, 1.5, (hole.sum(), 3))
    out = a.copy()
    out[sy, sx] = fill
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"), img.mode), mask


def scene(kitchen, rail):
    img = Image.open(UI / f"kitchen_{kitchen}.jpg").convert("RGB")
    img, _ = clear(img, rail["clear"], rail.get("whole", False))
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

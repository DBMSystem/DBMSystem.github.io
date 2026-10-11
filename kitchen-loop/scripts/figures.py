"""Customer figures cut out whole from the reference sheets (Daniel: "el gorro se corta", "el pelo del estudiante
está editado, rediséñalo con el pixel art de su personaje original").

In the mega pack the pose rows overlap (the student's hair reaches between the feet of the grandma above), and in
the customers sheet the rival chef's toque rises above its cell. A straight crop cut hair and hats flat, and the
cut opened the toque's outline so the background removal emptied it. Here each figure is separated from its
neighbours by a seam that follows the white gap between them (it crosses a figure only where two of them touch,
at their thinnest contact), so every figure keeps its original pixels: no hair or hat is redrawn.

Dev tool, not part of the game: `python3 scripts/figures.py` (needs Pillow + numpy). Rewrites the customer sprites
below and the poses derived from them (happy with hearts, angry, the tourist's boost).
"""
import numpy as np
from PIL import Image

import extract_sprites as ex

REACH = 48  # how far past a row's nominal edge the seam may go


def seam(cost, nominal, step=10):
    """Horizontal path through `cost` (rows × columns), cheapest overall. A step to another row pays for every
    figure pixel it crosses in that column, so the path only goes round figures through empty space; a slight
    pull towards the nominal row breaks ties."""
    h, w = cost.shape
    rows = np.arange(h)
    pull = 0.002 * np.abs(rows - nominal)
    total = cost[:, 0] + pull
    back = np.zeros((h, w), int)
    for x in range(1, w):
        csum = np.concatenate([[0], np.cumsum(cost[:, x])])
        best = np.full(h, np.inf)
        arg = np.zeros(h, int)
        for d in range(-step, step + 1):
            src = rows - d
            ok = (src >= 0) & (src < h)
            lo, hi = np.minimum(src, rows), np.maximum(src, rows)
            crossed = csum[np.clip(hi, 0, h - 1) + 1] - csum[np.clip(lo, 0, h - 1)]  # pixels from src to here
            prev = np.where(ok, total[np.clip(src, 0, h - 1)] + crossed + 0.01 * abs(d), np.inf)
            better = prev < best
            best[better] = prev[better]
            arg[better] = src[better]
        total = best + pull
        back[:, x] = arg
    path = np.zeros(w, int)
    path[-1] = int(np.argmin(total))
    for x in range(w - 1, 0, -1):
        path[x - 1] = back[path[x], x]
    return path


def figure(sheet, x0, x1, top, bottom):
    """The figure whose row spans top..bottom between columns x0..x1, with everything beyond the seams above and
    below it turned into background."""
    strip = np.asarray(sheet.convert("RGB").crop((x0, top - REACH, x1, bottom + REACH))).astype(int)
    h = strip.shape[0]
    border = np.concatenate([strip[:, 0], strip[:, -1]])
    bg = np.median(border, axis=0)
    cost = (np.abs(strip - bg).sum(axis=2) >= 60).astype(float)
    cost[strip.mean(axis=2) < 80] = 0.25  # where two figures touch, cut along their dark outlines
    upper = seam(cost[: 2 * REACH], REACH)
    lower = seam(cost[h - 2 * REACH:], REACH) + h - 2 * REACH
    out = strip.copy()
    for x in range(strip.shape[1]):
        out[: upper[x] + 1, x] = bg
        out[lower[x]:, x] = bg
    return Image.fromarray(out.astype("uint8"), "RGB")


def grow(mask, px):
    from PIL import ImageFilter
    return np.asarray(Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.MaxFilter(2 * px + 1))) > 0


def clean_hair_top(img, band=24):
    """Where the student's hair touches the grandma above, a bit of her skirt and shoe stays on it: in the top band
    only the hair (brown) and its own outline right next to it are kept."""
    a = np.asarray(img).copy()
    r, g, b, alpha = (a[..., k].astype(int) for k in range(4))
    solid = alpha > 0
    top = np.nonzero(solid.any(axis=1))[0][0]
    zone = np.zeros(solid.shape, bool)
    zone[top: top + band] = True
    hair = solid & (r - b > 45) & (r > g) & (r + g + b < 560)
    keep = hair | (grow(hair, 2) & ((r + g + b) / 3 < 90))
    a[zone & solid & ~keep, 3] = 0
    alpha = a[..., 3].copy()
    ex.drop_specks(alpha, keep_ratio=1)
    a[..., 3] = alpha
    return Image.fromarray(a, "RGBA")


def straight_bottom(img, trim):
    """Where the grandma's feet touch the student's hair below, her hem is ragged: cut straight above it, like the
    other half-length customers."""
    box = img.getbbox()
    return img.crop((0, 0, img.width, box[3] - trim))


def round_bun(img, outline=(40, 30, 30, 255)):
    """In the mega pack the tourist's jeans hide the top of the grandma's bun, so it ends in a straight line (the
    jeans' edge). Its corners are carved round, with her own dark outline along the new edge, like the bun of her
    angry pose; the bun's grey is never redrawn. The bit of jeans left on it goes too."""
    a = np.asarray(img).astype(int).copy()
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    jeans = (a[..., 3] > 0) & (b - r > 25)
    jeans[np.nonzero(a[..., 3].any(axis=1))[0][0] + 12:] = False
    a[jeans] = 0
    solid = a[..., 3] > 40
    top = np.nonzero(solid.any(axis=1))[0][0]
    xs = np.nonzero(solid[top])[0]
    left, right = xs[0], xs[-1]
    span = right - left
    depth = max(3, round(span * 0.22))
    for x in range(left, right + 1):
        u = (x - left) / span * 2 - 1
        edge = top + round(depth * (1 - np.sqrt(max(0.0, 1 - u * u))))
        a[top:edge, x] = 0
        column = np.nonzero(a[edge: edge + depth + 4, x, 3] > 40)[0]
        if len(column):
            y = edge + column[0]
            a[y: y + 2, x] = outline
    for _ in range(3):  # little spikes the jeans left standing beside the bun
        solid = a[..., 3] > 40
        for y in range(top, top + depth + 6):
            row = solid[y]
            x = 0
            while x < len(row):
                if row[x]:
                    end = x
                    while end < len(row) and row[end]:
                        end += 1
                    if end - x <= 4 and not solid[y - 1, x:end].any():
                        a[y, x:end] = 0
                    x = end
                else:
                    x += 1
    return Image.fromarray(a.astype("uint8"), "RGBA")


def clear_pockets(img, min_size=40):
    """The background enclosed between the tourist's cap, cheek and raised arm is not reached by the flood fill
    from the border and stays as a white wedge: near-white patches bigger than an eye's highlight are emptied."""
    a = np.asarray(img).copy()
    white = (a[..., 3] > 0) & (a[..., :3].astype(int).min(axis=2) > 225)
    h, w = white.shape
    seen = np.zeros_like(white)
    for y0, x0 in zip(*np.nonzero(white)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        stack, pixels = [(y0, x0)], []
        while stack:
            y, x = stack.pop()
            pixels.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(pixels) >= min_size:
            ys, xs = zip(*pixels)
            a[ys, xs, 3] = 0
    return Image.fromarray(a, "RGBA")


FIX = {"tourist": clear_pockets, "student": clean_hair_top, "calm": lambda img: round_bun(straight_bottom(img, 26))}


def poses():
    mega = Image.open(ex.ORIGINALS / "20_mega_pack.jpg")
    for customer_id, items in ex.CUSTOMER_POSES.items():
        for pose, (col, row) in items.items():
            crop = figure(mega, ex.POSE_COLS[col][0] - 6, ex.POSE_COLS[col][1] + 6, *ex.POSE_ROWS[row])
            cut = ex.remove_background(crop, tolerance=45, keep_ratio=1)
            if customer_id in FIX:
                cut = FIX[customer_id](cut)
            sprite = ex.fit(cut, ex.CUSTOMER_SIZE, upscale_nearest=True)
            ex.save(sprite, ex.SPRITES / "customers" / f"{customer_id}_{pose}.png")


def portraits():
    sheet = Image.open(ex.REF / "customers_ref.jpg")
    for customer_id, (col, row) in ex.CUSTOMER_CELLS.items():
        x0, y0, x1, y1 = ex.cell(col, row)
        crop = figure(sheet, x0, x1, y0, y1)
        ex.save(ex.fit(ex.remove_background(crop), ex.CUSTOMER_SIZE), ex.SPRITES / "customers" / f"{customer_id}.png")


def main():
    portraits()
    poses()
    ex.generate_happy_poses()
    reused_portraits()
    ex.generate_special_poses()
    ex.boost_poses()


def reused_portraits():
    """Customers without their own art reuse the big portraits (as in extract_sprites.generate_phase4_art)."""
    ex.save(ex.sprite("customers/student"), ex.SPRITES / "customers" / "collector.png")
    ex.save(ex.sprite("customers/tourist"), ex.SPRITES / "customers" / "night_visitor.png")
    critic = np.array(ex.sprite("customers/critic").convert("RGBA")).astype(float)
    r, g, b = critic[..., 0], critic[..., 1], critic[..., 2]
    purple = (b > r * 0.9) & (b > g * 1.15) & (critic[..., 3] > 0)
    critic[purple, :3] = critic[purple, :3] * 0.35 + 12  # the purple suit turns black
    ex.save(Image.fromarray(critic.clip(0, 255).astype("uint8")), ex.SPRITES / "customers" / "legendary_critic.png")



if __name__ == "__main__":
    main()

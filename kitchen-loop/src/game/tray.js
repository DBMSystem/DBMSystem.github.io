// Tray: fixed slots plus a preview of the next ingredient (spec 2.2).
// `golden` / `previewGolden` flag golden ingredients (spec 2.13), decided by `rollGolden(id)`.
export function createTray(slotCount, generate, rollGolden = () => false) {
  const tray = { slots: [], golden: [], preview: null, previewGolden: false, rollGolden };
  for (let i = 0; i < slotCount; i++) {
    tray.slots.push(generate(tray));
    tray.golden.push(rollGolden(tray.slots[i]));
  }
  setPreview(tray, generate(tray));
  return tray;
}

export function setPreview(tray, id, golden = tray.rollGolden(id)) {
  tray.preview = id;
  tray.previewGolden = golden;
}

// Takes the ingredient in `slot`; the preview moves into the slot and a new preview is generated.
export function takeFromTray(tray, slot, generate) {
  const ingredient = tray.slots[slot];
  tray.slots[slot] = tray.preview;
  tray.golden[slot] = tray.previewGolden;
  tray.preview = null;
  setPreview(tray, generate(tray));
  return ingredient;
}

// Ingredients some active order still needs beyond what is already on the grid and tray.
export function missingIngredients(orderRecipes, grid, tray) {
  const have = {};
  const count = (id) => {
    if (id) have[id] = (have[id] ?? 0) + 1;
  };
  grid.cells.forEach((cell) => count(cell.ingredient));
  tray.slots.forEach(count);
  count(tray.preview);
  const missing = new Set();
  for (const recipe of orderRecipes) {
    const need = {};
    for (const id of recipe.ingredients) need[id] = (need[id] ?? 0) + 1;
    for (const [id, amount] of Object.entries(need)) if ((have[id] ?? 0) < amount) missing.add(id);
  }
  return [...missing];
}

// How much each ingredient should be dealt: the unlocked recipes that use it (Daniel: every loop balanced). An
// ingredient few recipes need is dealt less, so it does not clutter the board; `blend` 0 = all equal.
export function demandWeights(pool, recipes, blend) {
  const uses = Object.fromEntries(pool.map((i) => [i.id, 0]));
  for (const recipe of recipes) for (const id of recipe.ingredients) if (id in uses) uses[id] += 1;
  const average = Object.values(uses).reduce((a, b) => a + b, 0) / Math.max(1, pool.length) || 1;
  return Object.fromEntries(pool.map((i) => [i.id, 1 - blend + (blend * uses[i.id]) / average]));
}

// Shuffled bag (like the pieces of a falling-block game): every ingredient comes up as often as its weight says
// within each bag, so a loop has neither long droughts nor floods of one ingredient. `size` = tokens per ingredient.
export function createBag(rng, pool, weightOf, size) {
  const tokens = [];
  const fill = () => {
    const total = pool.reduce((sum, i) => sum + weightOf(i), 0);
    const n = Math.max(pool.length, Math.round(size * pool.length));
    const exact = pool.map((i) => ({ id: i.id, x: (weightOf(i) / total) * n }));
    const counts = exact.map((e) => Math.floor(e.x));
    let left = n - counts.reduce((a, b) => a + b, 0);
    [...exact.keys()].sort((a, b) => (exact[b].x % 1) - (exact[a].x % 1)).forEach((k) => left-- > 0 && counts[k]++);
    exact.forEach((e, k) => tokens.push(...Array(counts[k]).fill(e.id)));
    for (let k = tokens.length - 1; k > 0; k--) {
      const j = rng.int(k + 1);
      [tokens[k], tokens[j]] = [tokens[j], tokens[k]];
    }
  };
  return {
    draw() {
      if (tokens.length === 0) fill();
      return tokens.pop();
    },
  };
}

// Next ingredient: from the bag (or a weighted roll), biased toward what active orders are missing (orderBias).
export function generateIngredient(rng, { pool, orderRecipes, grid, tray, orderBias, weightOf = (i) => i.weight, bag = null }) {
  if (orderRecipes.length > 0 && rng.next() < orderBias) {
    const poolIds = new Set(pool.map((i) => i.id));
    const missing = missingIngredients(orderRecipes, grid, tray).filter((id) => poolIds.has(id));
    if (missing.length > 0) return rng.pick(missing);
  }
  return bag ? bag.draw() : rng.weighted(pool, weightOf).id;
}

// Tray: fixed slots plus a preview of the next ingredient (spec 2.2).
export function createTray(slotCount, generate) {
  const tray = { slots: [], preview: null };
  for (let i = 0; i < slotCount; i++) tray.slots.push(generate(tray));
  tray.preview = generate(tray);
  return tray;
}

// Takes the ingredient in `slot`; the preview moves into the slot and a new preview is generated.
export function takeFromTray(tray, slot, generate) {
  const ingredient = tray.slots[slot];
  tray.slots[slot] = tray.preview;
  tray.preview = null;
  tray.preview = generate(tray);
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

// Weighted bag, biased toward what active orders are missing (orderBias).
export function generateIngredient(rng, { pool, orderRecipes, grid, tray, orderBias }) {
  if (orderRecipes.length > 0 && rng.next() < orderBias) {
    const poolIds = new Set(pool.map((i) => i.id));
    const missing = missingIngredients(orderRecipes, grid, tray).filter((id) => poolIds.has(id));
    if (missing.length > 0) return rng.pick(missing);
  }
  return rng.weighted(pool, (i) => i.weight).id;
}

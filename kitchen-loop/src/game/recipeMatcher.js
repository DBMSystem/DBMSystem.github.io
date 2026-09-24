import { rowOf, colOf, neighbors } from './grid.js';

const recipeKey = (ids) => [...ids].sort().join(',');

// Every orthogonally connected set of occupied cells with 2..maxSize cells, as bitmasks.
// Line and square patterns are connected too, so this covers all patterns (spec 2.4).
export function connectedSubsets(grid, maxSize) {
  const occupied = (index) => grid.cells[index].ingredient !== null;
  let layer = new Set();
  for (let i = 0; i < grid.cells.length; i++) if (occupied(i)) layer.add(1 << i);
  const result = [];
  for (let size = 2; size <= maxSize; size++) {
    const next = new Set();
    for (const mask of layer) {
      for (const index of maskToCells(mask)) {
        for (const n of neighbors(grid, index)) {
          if (occupied(n) && !(mask & (1 << n))) next.add(mask | (1 << n));
        }
      }
    }
    result.push(...next);
    layer = next;
  }
  return result.sort((a, b) => a - b);
}

export function maskToCells(mask) {
  const cells = [];
  for (let i = 0; mask >> i; i++) if (mask & (1 << i)) cells.push(i);
  return cells;
}

const same = (id, wanted, wildcard) => id === wanted || id === wildcard;

// Whether `ids` (with `wildcard` standing for any one ingredient) make up the recipe's ingredients.
function fillsWithWildcard(ids, recipe, wildcard) {
  const need = {};
  for (const id of recipe.ingredients) need[id] = (need[id] ?? 0) + 1;
  for (const id of ids) {
    if (id === wildcard) continue;
    if (!need[id]) return false;
    need[id] -= 1;
  }
  return true;
}

function fitsPattern(grid, cells, recipe, wildcard) {
  if (recipe.pattern === 'group') return true;
  const rows = new Set(cells.map((i) => rowOf(grid, i)));
  const cols = new Set(cells.map((i) => colOf(grid, i)));
  if (recipe.pattern === 'square') return cells.length === 4 && rows.size === 2 && cols.size === 2;
  // line: connected cells sharing a row or a column are contiguous.
  if (rows.size !== 1 && cols.size !== 1) return false;
  if (!recipe.ordered) return true;
  const sequence = cells.map((i) => grid.cells[i].ingredient); // cells are sorted along the line
  const forward = sequence.every((id, k) => same(id, recipe.ingredients[k], wildcard));
  const backward = sequence.every((id, k) => same(id, recipe.ingredients[recipe.ingredients.length - 1 - k], wildcard));
  return forward || backward;
}

// All placements of `recipes` currently on the grid: [{ recipe, cells }].
// `wildcard` (the Ancestral Spice, spec 3.1) replaces one ingredient of recipes with at least `wildcardMinSize` ingredients.
export function findMatches(grid, recipes, maxSize, { wildcard = null, wildcardMinSize = 3 } = {}) {
  const byKey = new Map();
  for (const recipe of recipes) {
    const key = recipeKey(recipe.ingredients);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(recipe);
  }
  const matches = [];
  for (const mask of connectedSubsets(grid, maxSize)) {
    const cells = maskToCells(mask);
    const ids = cells.map((i) => grid.cells[i].ingredient);
    const wild = wildcard ? ids.filter((id) => id === wildcard).length : 0;
    const candidates =
      wild === 0
        ? byKey.get(recipeKey(ids))
        : wild < ids.length && ids.length >= wildcardMinSize
          ? recipes.filter((r) => r.ingredients.length === ids.length && fillsWithWildcard(ids, r, wildcard))
          : null;
    if (!candidates) continue;
    for (const recipe of candidates) {
      if (fitsPattern(grid, cells, recipe, wildcard)) matches.push({ recipe, cells });
    }
  }
  return matches;
}

// Which match a tap on `cellIndex` cooks (spec 2.5): biggest, then one with an active order, then most points.
export function pickMatchAt(matches, cellIndex, orderedRecipeIds) {
  let best = null;
  const rank = (m) => [m.cells.length, orderedRecipeIds.has(m.recipe.id) ? 1 : 0, m.recipe.points];
  for (const match of matches) {
    if (!match.cells.includes(cellIndex)) continue;
    if (!best) {
      best = match;
      continue;
    }
    const a = rank(match);
    const b = rank(best);
    const k = a.findIndex((value, i) => value !== b[i]);
    if (k !== -1 && a[k] > b[k]) best = match;
  }
  return best;
}

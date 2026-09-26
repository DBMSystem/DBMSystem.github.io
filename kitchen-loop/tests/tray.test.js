import { describe, it, expect } from 'vitest';
import { createRng } from '../src/utils/rng.js';
import { createTray, takeFromTray, generateIngredient, missingIngredients, demandWeights, createBag } from '../src/game/tray.js';
import { createGrid } from '../src/game/grid.js';
import { ingredients } from '../src/data/ingredients.js';
import { recipeById } from '../src/data/recipes.js';
import { balance } from '../src/data/balance.js';

const pool = ingredients.filter((i) => ['egg', 'bacon', 'bread', 'tomato', 'cheese'].includes(i.id));

function sequence(seed, orderRecipes = [], length = 30) {
  const rng = createRng(seed);
  const grid = createGrid(4);
  const gen = (tray) => generateIngredient(rng, { pool, orderRecipes, grid, tray, orderBias: balance.orderBias });
  const tray = createTray(3, gen);
  const out = [...tray.slots, tray.preview];
  for (let i = 0; i < length; i++) {
    takeFromTray(tray, i % 3, gen);
    out.push(tray.preview);
  }
  return out;
}

describe('ingredient generation', () => {
  it('is reproducible with the same seed', () => {
    expect(sequence(42)).toEqual(sequence(42));
    expect(sequence(42)).not.toEqual(sequence(43));
  });

  it('only produces unlocked ingredients', () => {
    const ids = new Set(pool.map((i) => i.id));
    expect(sequence(7, [], 500).every((id) => ids.has(id))).toBe(true);
  });

  it('takeFromTray moves the preview into the slot', () => {
    const tray = { slots: ['egg', 'bacon', 'bread'], golden: [false, false, false], preview: 'tomato', previewGolden: true, rollGolden: () => false };
    expect(takeFromTray(tray, 1, () => 'cheese')).toBe('bacon');
    expect(tray).toMatchObject({ slots: ['egg', 'tomato', 'bread'], golden: [false, true, false], preview: 'cheese', previewGolden: false });
  });

  it('missing ingredients discount what is on the grid and tray', () => {
    const grid = createGrid(4);
    grid.cells[0].ingredient = 'bread';
    const tray = { slots: ['tomato', 'egg', 'egg'], preview: null };
    expect(missingIngredients([recipeById.special_toast], grid, tray)).toEqual(['cheese']);
  });

  it('orderBias favours what active orders miss', () => {
    const rng = createRng(3);
    const grid = createGrid(4);
    const tray = { slots: ['bread', 'tomato', 'egg'], preview: 'egg' };
    const rate = (orderRecipes) => {
      let cheese = 0;
      for (let i = 0; i < 5000; i++) {
        if (generateIngredient(rng, { pool, orderRecipes, grid, tray, orderBias: balance.orderBias }) === 'cheese') cheese++;
      }
      return cheese / 5000;
    };
    // Only cheese is missing: 0,35 + 0,65 × 1/5 ≈ 0,48 instead of 0,2.
    expect(rate([recipeById.special_toast])).toBeCloseTo(0.48, 1);
    expect(rate([])).toBeCloseTo(0.2, 1);
  });

  it('deals each ingredient by how many recipes use it (demandWeighting)', () => {
    const level5 = ingredients.filter((i) => ['egg', 'bacon', 'bread', 'tomato', 'cheese', 'mushroom', 'potato', 'onion', 'herbs'].includes(i.id));
    const recipes = [
      'bacon_egg',
      'tomato_toast',
      'special_toast',
      'triple_bacon',
      'cheesy_scramble',
      'mushroom_omelette',
      'bacon_sandwich',
      'bravas',
      'spanish_omelette',
      'garden_salad',
    ].map((id) => recipeById[id]);
    const w = demandWeights(level5, recipes, 0.5);
    expect(w.egg).toBeGreaterThan(1); // in 5 recipes
    expect(w.herbs).toBeLessThan(1); // only in the salad
    expect(w.herbs).toBeGreaterThan(0.5); // never gone: half the weight stays equal for all
    expect(Object.values(demandWeights(level5, recipes, 0)).every((x) => x === 1)).toBe(true);
  });

  it('the bag deals every ingredient by its weight, with no long droughts', () => {
    const rng = createRng(9);
    const bag = createBag(rng, pool, () => 1, 2);
    const draws = Array.from({ length: 100 }, () => bag.draw());
    for (const { id } of pool) expect(draws.filter((x) => x === id)).toHaveLength(20);
    // Within a bag of 10 every ingredient appears twice, so the gap between two of the same is at most 18 draws.
    for (const { id } of pool) {
      const at = draws.map((x, k) => (x === id ? k : -1)).filter((k) => k >= 0);
      expect(Math.max(...at.slice(1).map((k, j) => k - at[j]))).toBeLessThanOrEqual(18);
    }
  });
});

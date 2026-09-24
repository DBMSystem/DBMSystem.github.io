import { describe, it, expect } from 'vitest';
import { createRng } from '../src/utils/rng.js';
import { createTray, takeFromTray, generateIngredient, missingIngredients } from '../src/game/tray.js';
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
});

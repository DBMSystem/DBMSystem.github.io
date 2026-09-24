import { describe, it, expect } from 'vitest';
import { findMatches, pickMatchAt } from '../src/game/recipeMatcher.js';
import { recipes, recipeById } from '../src/data/recipes.js';
import { gridFrom } from './helpers.js';

const ids = (matches) => matches.map((m) => m.recipe.id).sort();
const only = (...names) => names.map((n) => recipeById[n]);

describe('findMatches — patterns', () => {
  it('group: any orthogonally connected shape', () => {
    const grid = gridFrom(['bread . . .', 'tomato cheese . .', '. . . .', '. . . .']);
    expect(ids(findMatches(grid, only('special_toast'), 4))).toEqual(['special_toast']);
  });

  it('group: diagonal cells are not connected', () => {
    const grid = gridFrom(['egg . . .', '. bacon . .', '. . . .', '. . . .']);
    expect(findMatches(grid, only('bacon_egg'), 4)).toEqual([]);
  });

  it('group: extra neighbours do not block the recipe', () => {
    const grid = gridFrom(['egg bacon tomato .', '. . . .', '. . . .', '. . . .']);
    expect(ids(findMatches(grid, only('bacon_egg'), 4))).toEqual(['bacon_egg']);
  });

  it('line: horizontal and vertical, not bent', () => {
    const horizontal = gridFrom(['bacon bacon bacon .', '. . . .', '. . . .', '. . . .']);
    const vertical = gridFrom(['bacon . . .', 'bacon . . .', 'bacon . . .', '. . . .']);
    const bent = gridFrom(['bacon bacon . .', 'bacon . . .', '. . . .', '. . . .']);
    expect(ids(findMatches(horizontal, only('triple_bacon'), 4))).toEqual(['triple_bacon']);
    expect(ids(findMatches(vertical, only('triple_bacon'), 4))).toEqual(['triple_bacon']);
    expect(findMatches(bent, only('triple_bacon'), 4)).toEqual([]);
  });

  it('ordered line: order matters, both directions accepted', () => {
    const ok = gridFrom(['bacon egg bacon .', '. . . .', '. . . .', '. . . .']);
    const wrong = gridFrom(['egg bacon bacon .', '. . . .', '. . . .', '. . . .']);
    const vertical = gridFrom(['. bread . .', '. bacon . .', '. bread . .', '. . . .']);
    expect(ids(findMatches(ok, only('bacon_crown'), 4))).toEqual(['bacon_crown']);
    expect(findMatches(wrong, only('bacon_crown'), 4)).toEqual([]);
    expect(ids(findMatches(vertical, only('bacon_sandwich'), 4))).toEqual(['bacon_sandwich']);
  });

  it('ordered line: an asymmetric order matches reversed', () => {
    const recipe = { id: 'test', ingredients: ['egg', 'bacon', 'bread'], pattern: 'line', ordered: true, points: 1 };
    const reversed = gridFrom(['bread bacon egg .', '. . . .', '. . . .', '. . . .']);
    const mixed = gridFrom(['bacon egg bread .', '. . . .', '. . . .', '. . . .']);
    expect(findMatches(reversed, [recipe], 4)).toHaveLength(1);
    expect(findMatches(mixed, [recipe], 4)).toHaveLength(0);
  });

  it('square: 2x2 only', () => {
    const square = gridFrom(['egg egg . .', 'egg egg . .', '. . . .', '. . . .']);
    const line = gridFrom(['egg egg egg egg', '. . . .', '. . . .', '. . . .']);
    const ell = gridFrom(['egg egg egg .', 'egg . . .', '. . . .', '. . . .']);
    expect(ids(findMatches(square, only('impossible_omelette'), 4))).toEqual(['impossible_omelette']);
    expect(findMatches(line, only('impossible_omelette'), 4)).toEqual([]);
    expect(findMatches(ell, only('impossible_omelette'), 4)).toEqual([]);
  });

  it('works on a 5x5 grid', () => {
    const grid = gridFrom(['. . . . .', '. . . . .', '. . . . .', '. . . . .', '. . . fish herbs']);
    expect(ids(findMatches(grid, only('herb_fish'), 4))).toEqual(['herb_fish']);
  });
});

describe('pickMatchAt — priorities', () => {
  const all = recipes;

  it('1) the biggest recipe wins', () => {
    const grid = gridFrom(['bread tomato . .', 'cheese . . .', '. . . .', '. . . .']);
    const matches = findMatches(grid, only('tomato_toast', 'special_toast'), 4);
    expect(pickMatchAt(matches, 0, new Set()).recipe.id).toBe('special_toast');
  });

  it('2) with the same size, the one with an active order', () => {
    const grid = gridFrom(['tomato bread . .', 'potato . . .', '. . . .', '. . . .']);
    const matches = findMatches(grid, only('tomato_toast', 'bravas'), 4);
    expect(pickMatchAt(matches, 0, new Set(['bravas'])).recipe.id).toBe('bravas');
    expect(pickMatchAt(matches, 0, new Set(['tomato_toast'])).recipe.id).toBe('tomato_toast');
  });

  it('3) with the same size and no order, the one with more points', () => {
    const grid = gridFrom(['tomato bread . .', 'potato . . .', '. . . .', '. . . .']);
    const matches = findMatches(grid, only('tomato_toast', 'bravas'), 4);
    expect(pickMatchAt(matches, 0, new Set()).recipe.id).toBe('bravas'); // 60 > 50
  });

  it('secret recipe is cooked when it is the biggest one containing the cell', () => {
    const grid = gridFrom(['bacon egg bacon .', '. . . .', '. . . .', '. . . .']);
    const matches = findMatches(grid, all, 4);
    expect(pickMatchAt(matches, 1, new Set(['bacon_egg'])).recipe.id).toBe('bacon_crown');
  });

  it('returns null when the cell is in no recipe', () => {
    const grid = gridFrom(['egg . . cheese', '. . . .', '. . . .', '. . . .']);
    expect(pickMatchAt(findMatches(grid, all, 4), 3, new Set())).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ingredients, ingredientById } from '../src/data/ingredients.js';
import { recipes } from '../src/data/recipes.js';
import { customers, customerById } from '../src/data/customers.js';
import { levelUnlocks, utensilUnlocks } from '../src/data/unlocks.js';
import { balance } from '../src/data/balance.js';
import { hasKey } from '../src/utils/i18n.js';

const unique = (list) => new Set(list).size === list.length;

describe('data integrity', () => {
  it('ids are unique', () => {
    expect(unique(ingredients.map((i) => i.id))).toBe(true);
    expect(unique(recipes.map((r) => r.id))).toBe(true);
    expect(unique(customers.map((c) => c.id))).toBe(true);
  });

  it('recipes only use known ingredients, max size respected, "combo" never a recipe name', () => {
    for (const r of recipes) {
      expect(r.ingredients.length).toBeLessThanOrEqual(balance.maxRecipeSize);
      for (const id of r.ingredients) expect(ingredientById[id]).toBeDefined();
      expect(r.id).not.toMatch(/combo/);
    }
  });

  it('every ingredient of a level recipe is unlocked at or before that level', () => {
    const unlockedAt = {};
    for (const row of levelUnlocks) for (const id of row.ingredients ?? []) unlockedAt[id] ??= row.level;
    for (const row of levelUnlocks) {
      for (const recipeId of row.recipes ?? []) {
        const recipe = recipes.find((r) => r.id === recipeId);
        expect(recipe, recipeId).toBeDefined();
        for (const id of recipe.ingredients) expect(unlockedAt[id], `${recipeId}/${id}`).toBeLessThanOrEqual(row.level);
      }
      for (const id of row.customers ?? []) expect(customerById[id], id).toBeDefined();
    }
  });

  it('every recipe is unlocked exactly once (level or utensil) except tree-complete ones', () => {
    const sources = [...levelUnlocks.flatMap((r) => r.recipes ?? []), ...Object.values(utensilUnlocks).flatMap((u) => u.recipes)];
    expect(unique(sources)).toBe(true);
    const missing = recipes.filter((r) => !sources.includes(r.id)).map((r) => r.id);
    expect(missing).toEqual(['lost_recipe']); // unlocked by the complete tree (phase 4)
  });

  it('every t() key used in the code exists in es.js', () => {
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(js|jsx)$/.test(name) && name !== 'i18n.js') files.push(path);
      }
    };
    walk(join(import.meta.dirname, '../src'));
    const keys = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]));
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) expect(hasKey(key), key).toBe(true);
    for (const r of recipes) expect(hasKey(`recipe.${r.id}`)).toBe(true);
    for (const i of ingredients) expect(hasKey(`ingredient.${i.id}`)).toBe(true);
    for (const c of customers) expect(hasKey(`customer.${c.id}`)).toBe(true);
  });

  it('duplicate fragments are always below the craft cost', () => {
    for (const rarity of Object.keys(balance.craftCost)) {
      expect(balance.duplicateFragments[rarity]).toBeLessThan(balance.craftCost[rarity]);
    }
  });
});

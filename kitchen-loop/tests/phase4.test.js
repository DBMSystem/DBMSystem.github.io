import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/game/engine.js';
import { findMatches } from '../src/game/recipeMatcher.js';
import { getUnlockedContent } from '../src/systems/unlocks.js';
import { recipes, recipeById } from '../src/data/recipes.js';
import { customerById } from '../src/data/customers.js';
import { utensils } from '../src/data/utensils.js';
import { balance } from '../src/data/balance.js';
import { gridFrom } from './helpers.js';
import { chooseOrder } from '../src/game/customers.js';
import { createRng } from '../src/utils/rng.js';

const DT = 1 / 60;
const ALL = utensils.map((u) => u.id);
const setup = (options = {}) => createEngine({ balance, level: 10, seed: 3, ...options });

function fill(engine, ids) {
  ids.forEach((id, i) => {
    if (id !== '.') Object.assign(engine.state.grid.cells[i], { ingredient: id, placedSeq: ++engine.state.placeSeq });
  });
  engine.refreshMatches();
}
const run = (engine, seconds) => {
  for (let t = 0; t < seconds; t += DT) engine.step(DT);
};

describe('unlocks by chapter, utensils and the complete tree', () => {
  it('chapter 3 opens the warehouse, the night visitor and Brûlée’s Night', () => {
    expect(getUnlockedContent(10).customers).not.toContain('night_visitor');
    const c3 = getUnlockedContent(10, { chapter: 3 });
    expect(c3.customers).toContain('night_visitor');
    expect(c3.features).toEqual(expect.arrayContaining(['warehouse', 'bruleeNight']));
  });

  it('utensils add their content; the whole tree adds the truffle and the lost recipe', () => {
    expect(getUnlockedContent(1, { utensils: ['golden_whisk'] }).recipes).toContain('french_omelette');
    expect(getUnlockedContent(1, { utensils: ALL.slice(1) }).recipes).not.toContain('lost_recipe');
    const full = getUnlockedContent(1, { utensils: ALL });
    expect(full.recipes).toContain('lost_recipe');
    expect(full.ingredients).toEqual(expect.arrayContaining(['truffle', 'flame', 'spice', 'clock']));
  });
});

describe('Ancestral Spice (wildcard)', () => {
  const cook = (ids) => recipes.filter((r) => ids.includes(r.id));
  it('stands for one ingredient in recipes of 3 or more', () => {
    const grid = gridFrom(['egg spice . .', '. . . .', '. . . .', '. . . .']);
    expect(findMatches(grid, cook(['bacon_egg']), 4, { wildcard: 'spice' })).toEqual([]);
    const three = gridFrom(['bread spice cheese .', '. . . .', '. . . .', '. . . .']);
    const found = findMatches(three, cook(['special_toast']), 4, { wildcard: 'spice' });
    expect(found.map((m) => m.recipe.id)).toEqual(['special_toast']);
  });
  it('works in ordered lines and never alone', () => {
    const line = gridFrom(['bread spice bread .', '. . . .', '. . . .', '. . . .']);
    expect(findMatches(line, cook(['bacon_sandwich']), 4, { wildcard: 'spice' }).length).toBe(1);
    const alone = gridFrom(['spice spice spice .', '. . . .', '. . . .', '. . . .']);
    expect(findMatches(alone, cook(['triple_bacon']), 4, { wildcard: 'spice' })).toEqual([]);
  });
});

describe('Runic Counter and abilities', () => {
  it('the runic counter makes a 5x5 grid with 4 customers', () => {
    const engine = setup({ unlocks: { chapter: 3, utensils: ['runic_counter'] } });
    expect(engine.state.grid.cells).toHaveLength(25);
    expect(engine.state.rules).toMatchObject({ gridSize: 5, maxCustomers: 4, customerInterval: 6 });
  });

  it('move, discard and freeze have limited uses and need their utensil', () => {
    const none = setup();
    fill(none, ['egg']);
    expect(none.moveIngredient(0, 5)).toBe(false);
    expect(none.discardAt(0)).toBe(false);

    const engine = setup({ unlocks: { utensils: ['crystal_spatula', 'mystic_knife', 'frost_tongs'] } });
    fill(engine, ['egg', '.', 'bacon']);
    expect(engine.moveIngredient(0, 1)).toBe(true);
    expect(engine.state.grid.cells[1].ingredient).toBe('egg');
    expect(engine.state.matches.some((m) => m.recipe.id === 'bacon_egg')).toBe(true);
    expect(engine.state.abilities.move).toBe(balance.abilityUses.move - 1);
    expect(engine.discardAt(2)).toBe(true);
    expect(engine.state.grid.cells[2].ingredient).toBeNull();
    expect(engine.discardAt(1)).toBe(true);
    expect(engine.discardAt(0)).toBe(false); // empty cell
    fill(engine, ['egg']);
    expect(engine.discardAt(0)).toBe(false); // no uses left
    expect(engine.freeze()).toBe(true);
    expect(engine.freeze()).toBe(false);
  });

  it('freeze stops patience', () => {
    const engine = setup({ unlocks: { utensils: ['frost_tongs'] } });
    engine.orderFrom('calm', 'bacon_egg');
    const customer = engine.state.customers[0];
    const before = customer.patience;
    engine.freeze();
    run(engine, balance.freezeDuration - 0.5);
    expect(customer.patience).toBe(before);
    run(engine, 1);
    expect(customer.patience).toBeLessThan(before);
  });

  it('discard rescues an overflowing kitchen', () => {
    const engine = setup({ unlocks: { utensils: ['mystic_knife'] } });
    const noRecipe = (i) => ((Math.floor(i / 4) + i) % 2 === 0 ? 'fish' : 'cheese');
    fill(
      engine,
      Array.from({ length: 15 }, (_, i) => noRecipe(i)),
    );
    engine.state.tray.slots[0] = noRecipe(15);
    engine.placeIngredient(0, 15);
    expect(engine.state.status).toBe('overflow');
    expect(engine.discardAt(3)).toBe(true);
    expect(engine.state.status).toBe('playing');
  });
});

describe('special ingredients', () => {
  it('the kitchen clock adds time and leaves the cell empty', () => {
    const engine = setup({ unlocks: { utensils: ['time_ladle'] } });
    engine.state.tray.slots[0] = 'clock';
    const before = engine.state.timeLeft;
    expect(engine.placeIngredient(0, 4)).toBe(true);
    expect(engine.state.timeLeft).toBe(before + balance.clockTime);
    expect(engine.state.grid.cells[4].ingredient).toBeNull();
  });

  it('caps clock and spice per loop; specials only when unlocked', () => {
    const drawMany = (engine) => {
      for (let i = 0; i < 2000; i++) {
        engine.placeIngredient(0, 0);
        Object.assign(engine.state.grid.cells[0], { ingredient: null });
        engine.state.status = 'playing';
      }
    };
    const plain = setup({ seed: 9 });
    drawMany(plain);
    expect(plain.state.specialsSpawned).toEqual({});
    const engine = setup({ seed: 9, unlocks: { utensils: ['time_ladle', 'ancient_spice'] } });
    drawMany(engine);
    expect(engine.state.specialsSpawned.clock).toBe(balance.specialIngredientCaps.clock);
    expect(engine.state.specialsSpawned.spice).toBe(balance.specialIngredientCaps.spice);
  });
});

describe('special and legendary customers', () => {
  it('at most one at a time and one legendary per loop', () => {
    const always = { ...balance, customerInterval: 1 };
    const engine = createEngine({ balance: always, level: 10, seed: 5, unlocks: { chapter: 3 } });
    let maxRare = 0;
    let legendaries = 0;
    for (let t = 0; t < 55; t += DT) {
      engine.step(DT);
      for (const e of engine.drainEvents()) if (e.type === 'customerArrived' && e.category === 'legendary') legendaries++;
      maxRare = Math.max(maxRare, engine.state.customers.filter((c) => customerById[c.typeId].category !== 'common').length);
    }
    expect(maxRare).toBeLessThanOrEqual(balance.maxSpecialCustomers);
    expect(legendaries).toBeLessThanOrEqual(balance.legendaryPerLoop);
  });

  it('the collector gives fragments and served recipes are remembered', () => {
    const engine = setup();
    engine.orderFrom('collector', 'bacon_egg');
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    expect(engine.getResult().fragments).toBe(customerById.collector.fragments);
    expect(engine.state.servedRecipes).toEqual(['bacon_egg']);
  });

  it('the mystery customer orders something not served this loop', () => {
    const orderable = ['bacon_egg', 'tomato_toast'].map((id) => recipeById[id]);
    const ctx = { ordersIssued: 5, activeRecipeIds: new Set(), servedRecipes: ['bacon_egg'] };
    for (let seed = 1; seed < 20; seed++) expect(chooseOrder(createRng(seed), customerById.mystery, orderable, ctx, balance).id).toBe('tomato_toast');
  });

  it('Crítico en Sala guarantees a critic', () => {
    const engine = setup({ specialty: 'criticInRoom' });
    const arrived = [];
    for (let t = 0; t < 50; t += DT) {
      engine.step(DT);
      for (const e of engine.drainEvents()) if (e.type === 'customerArrived') arrived.push(e.customer.typeId);
    }
    expect(arrived).toContain('critic');
  });
});

describe('golden ingredients and specialties', () => {
  it('a golden ingredient doubles the dish points', () => {
    const plain = setup();
    fill(plain, ['egg', 'bacon']);
    plain.cookAt(0);
    const golden = setup();
    fill(golden, ['egg', 'bacon']);
    golden.state.grid.cells[0].golden = true;
    golden.cookAt(0);
    expect(golden.state.score).toBe(plain.state.score * balance.goldenPointsMultiplier);
    expect(golden.getResult().goldenCooked).toBe(1);
  });

  it('Hora del Desayuno: egg recipes score more', () => {
    const plain = setup();
    fill(plain, ['egg', 'bacon']);
    plain.cookAt(0);
    const breakfast = setup({ specialty: 'breakfast' });
    fill(breakfast, ['egg', 'bacon']);
    breakfast.cookAt(0);
    expect(breakfast.state.score).toBe(Math.round(plain.state.score * (1 + balance.specialties.breakfast.pointsBonus)));
  });

  it('Visita de Pip places ingredients; Noche de Brûlée gives a fragment per order', () => {
    const engine = setup({ specialty: 'pipVisit' });
    run(engine, balance.specialties.pipVisit.interval + 0.1);
    expect(engine.state.grid.cells.some((c) => c.ingredient)).toBe(true);
    const night = setup({ specialty: 'bruleeNight', unlocks: { chapter: 3 } });
    night.orderFrom('calm', 'bacon_egg');
    fill(night, ['egg', 'bacon']);
    night.cookAt(0);
    expect(night.getResult().fragments).toBe(balance.specialties.bruleeNight.fragmentsPerOrder);
  });
});

it('every utensil recipe is reachable from its utensil', () => {
  for (const r of recipes.filter((r) => r.kind === 'utensil')) {
    expect(getUnlockedContent(1, { utensils: ALL }).recipes, r.id).toContain(r.id);
  }
  expect(recipeById.garden_skewer.ingredients).toContain('flame');
});

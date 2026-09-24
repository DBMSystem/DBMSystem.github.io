import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/game/engine.js';
import { balance } from '../src/data/balance.js';

const DT = 1 / 60;

function setup(options = {}) {
  const calls = { overflow: [], end: [] };
  const engine = createEngine({
    balance,
    level: 7,
    seed: 1,
    onOverflow: (info) => calls.overflow.push(info),
    onEnd: (result) => calls.end.push(result),
    ...options,
  });
  return { engine, calls };
}

// Places ids straight into the grid (bypasses the tray), in cell order.
function fill(engine, ids) {
  const { cells } = engine.state.grid;
  ids.forEach((id, i) => {
    if (id !== '.') {
      cells[i].ingredient = id;
      cells[i].placedSeq = ++engine.state.placeSeq;
    }
  });
  engine.refreshMatches();
}

const wait = (engine, seconds) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) engine.step(DT);
};

function placeFromTray(engine, cell) {
  return engine.placeIngredient(0, cell);
}

describe('engine — overflow', () => {
  // A fish/cheese checkerboard never forms a recipe.
  const noRecipe = (i) => ((Math.floor(i / 4) + i) % 2 === 0 ? 'fish' : 'cheese');

  it('full grid with no cookable recipe overflows', () => {
    const { engine, calls } = setup();
    fill(engine, Array.from({ length: 16 }, (_, i) => (i === 15 ? '.' : noRecipe(i))));
    engine.state.tray.slots[0] = noRecipe(15);
    placeFromTray(engine, 15);
    expect(engine.state.status).toBe('overflow');
    expect(calls.overflow).toEqual([{ secondChanceAvailable: true, canDiscard: false }]);
  });

  it('full grid with a cookable recipe does not overflow', () => {
    const { engine } = setup();
    fill(engine, Array.from({ length: 16 }, (_, i) => (i === 15 ? '.' : i === 14 ? 'herbs' : noRecipe(i))));
    engine.state.tray.slots[0] = 'fish'; // fish + herbs = Pescado a las Hierbas
    placeFromTray(engine, 15);
    expect(engine.state.status).toBe('playing');
  });

  it('an undiscovered secret with its requirement met also prevents overflow', () => {
    const { engine } = setup({ level: 3 });
    // A 2x2 of eggs (Tortilla Imposible, secret from level 3) surrounded by bread/cheese that form nothing.
    fill(engine, [
      'egg', 'egg', 'bread', 'cheese',
      'egg', 'egg', 'bread', 'cheese',
      'bread', 'cheese', 'bread', 'cheese',
      'cheese', 'bread', 'cheese', '.',
    ]);
    engine.state.tray.slots[0] = 'cheese';
    placeFromTray(engine, 15);
    expect(engine.state.status).toBe('playing');
    expect(engine.state.glowing.has(0)).toBe(false); // secrets do not glow before discovery
    expect(engine.cookAt(0)).toBe(true);
    expect(engine.getResult().discovered).toEqual(['impossible_omelette']);
  });

  it('second chance: once per loop, clears the 8 oldest and adds time; results only at the real end', () => {
    const { engine, calls } = setup();
    fill(engine, Array.from({ length: 16 }, (_, i) => (i === 15 ? '.' : noRecipe(i))));
    engine.state.tray.slots[0] = noRecipe(15);
    placeFromTray(engine, 15);
    const timeBefore = engine.state.timeLeft;
    expect(engine.applySecondChance()).toBe(true);
    expect(engine.state.timeLeft).toBeCloseTo(timeBefore + balance.secondChanceTime);
    const empty = engine.state.grid.cells.map((c, i) => (c.ingredient === null ? i : -1)).filter((i) => i >= 0);
    expect(empty).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(calls.end).toHaveLength(0);

    // Overflow again: no second chance this time.
    fill(engine, Array.from({ length: 16 }, (_, i) => noRecipe(i)));
    engine.state.grid.cells[0].ingredient = null;
    engine.state.tray.slots[0] = noRecipe(0);
    placeFromTray(engine, 0);
    expect(calls.overflow[1]).toEqual({ secondChanceAvailable: false, canDiscard: false });
    expect(engine.applySecondChance()).toBe(false);
    engine.finishOverflow();
    expect(calls.end).toHaveLength(1);
    expect(calls.end[0].endReason).toBe('overflow');
  });

  it('time stops while the overflow decision is pending', () => {
    const { engine } = setup();
    fill(engine, Array.from({ length: 16 }, (_, i) => (i === 15 ? '.' : noRecipe(i))));
    engine.state.tray.slots[0] = noRecipe(15);
    placeFromTray(engine, 15);
    const t = engine.state.timeLeft;
    for (let i = 0; i < 120; i++) engine.step(DT);
    expect(engine.state.timeLeft).toBe(t);
  });
});

describe('engine — cooking and serving', () => {
  it('serves the customer with least patience and gives the order bonus', () => {
    const { engine } = setup({ level: 1 });
    engine.state.customers = [
      { uid: 1, typeId: 'calm', recipeId: 'bacon_egg', slot: 0, patience: 10, maxPatience: 20 },
      { uid: 2, typeId: 'calm', recipeId: 'bacon_egg', slot: 1, patience: 4, maxPatience: 20 },
    ];
    engine.state.nextCustomerAt = Infinity;
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    expect(engine.state.customers.find((c) => c.cooking).uid).toBe(2); // into the pan of the most impatient
    expect(engine.state.score).toBe(0);
    wait(engine, balance.panCookTime + DT);
    expect(engine.state.customers.map((c) => c.uid)).toEqual([1]);
    expect(engine.state.score).toBe(75);
    expect(engine.state.ordersServed).toBe(1);
  });

  it('counter sale when nobody ordered it', () => {
    const { engine } = setup({ level: 1 });
    fill(engine, ['bread', 'tomato']);
    engine.cookAt(1);
    expect(engine.state.score).toBe(25);
    expect(engine.state.ordersServed).toBe(0);
  });

  it('cooked cells stay blocked during the cook animation', () => {
    const { engine } = setup({ level: 1 });
    fill(engine, ['bread', 'tomato']);
    engine.cookAt(0);
    engine.state.tray.slots[0] = 'egg';
    expect(engine.placeIngredient(0, 0)).toBe(false);
    for (let i = 0; i < Math.ceil(balance.cookDuration / DT) + 1; i++) engine.step(DT);
    expect(engine.placeIngredient(0, 0)).toBe(true);
  });

  it('a tap without recipe does nothing but emits feedback', () => {
    const { engine } = setup({ level: 1 });
    fill(engine, ['egg', '.', 'cheese']);
    engine.drainEvents();
    expect(engine.cookAt(0)).toBe(false);
    expect(engine.drainEvents()).toEqual([{ type: 'noRecipe', cell: 0 }]);
  });

  it('loop ends when time runs out', () => {
    const { engine, calls } = setup({ level: 1 });
    for (let i = 0; i < balance.loopDuration * 60 + 5; i++) engine.step(DT);
    expect(engine.state.status).toBe('ended');
    expect(calls.end[0].endReason).toBe('time');
  });

  it('customers arrive, first at second 1, at most maxCustomers, only unlocked orders', () => {
    const { engine } = setup({ level: 1 });
    for (let i = 0; i < 59; i++) engine.step(DT);
    expect(engine.state.customers).toHaveLength(0);
    engine.step(DT * 2);
    expect(engine.state.customers).toHaveLength(1);
    for (let i = 0; i < 60 * 30; i++) engine.step(DT);
    expect(engine.state.customers.length).toBeLessThanOrEqual(balance.maxCustomers);
  });
});

describe('engine — cooking in the pan (spec 2.6)', () => {
  const order = (engine, patience, recipeId = 'bacon_egg') => {
    engine.state.nextCustomerAt = Infinity;
    engine.state.customers = [{ uid: 1, typeId: 'calm', recipeId, slot: 0, patience, maxPatience: 20 }];
  };

  it('the order sizzles in its pan and is served when ready', () => {
    const { engine } = setup({ level: 1 });
    order(engine, 20);
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    const [cook] = engine.drainEvents();
    expect(cook).toMatchObject({ type: 'cook', customerSlot: 0 });
    expect(engine.state.grid.cells[0].ingredient).toBeNull(); // the board is free at once
    wait(engine, balance.panCookTime - 0.1);
    expect(engine.state.ordersServed).toBe(0);
    wait(engine, 0.2);
    expect(engine.drainEvents().find((e) => e.type === 'served')).toMatchObject({ slot: 0, recipeId: 'bacon_egg', points: 75 });
    expect(engine.getResult()).toMatchObject({ ordersServed: 1, customersLost: 0, burntCount: 0 });
  });

  it('a customer with a dish in the pan cannot be cooked for twice', () => {
    const { engine } = setup({ level: 1 });
    order(engine, 20);
    fill(engine, ['egg', 'bacon', 'egg', 'bacon']);
    engine.cookAt(0);
    engine.cookAt(2);
    expect(engine.drainEvents().filter((e) => e.type === 'cook').map((e) => e.customerSlot)).toEqual([0, null]); // the second one is a counter sale
  });

  it('if patience runs out first, the dish burns: no points, no pay', () => {
    const { engine } = setup({ level: 1 });
    order(engine, 1);
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    wait(engine, balance.panCookTime + 0.1);
    const events = engine.drainEvents();
    expect(events.find((e) => e.type === 'burnt')).toMatchObject({ recipeId: 'bacon_egg' });
    expect(events.some((e) => e.type === 'served' || e.type === 'customerLeft')).toBe(false);
    expect(engine.getResult()).toMatchObject({ score: 0, ordersServed: 0, orderCoins: 0, customersLost: 1, burntCount: 1 });
  });

  it('combo counts when the recipe is tapped, not when it is served', () => {
    const { engine } = setup({ level: 1 });
    order(engine, 20);
    fill(engine, ['egg', 'bacon', 'bread', 'tomato']);
    engine.cookAt(0);
    engine.cookAt(2);
    expect(engine.state.combo.chain).toBe(2);
  });

  it('at time-up the pans still cooking finish and serve before the results', () => {
    const { engine, calls } = setup({ level: 1 });
    order(engine, 20);
    engine.state.timeLeft = 1;
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    wait(engine, 1.1);
    expect(engine.state.status).toBe('closing');
    expect(engine.placeIngredient(0, 5)).toBe(false);
    expect(calls.end).toHaveLength(0);
    wait(engine, balance.panCookTime);
    expect(calls.end).toHaveLength(1);
    expect(calls.end[0]).toMatchObject({ ordersServed: 1, endReason: 'time' });
  });

  it('ending on an overflow still serves the dishes in the pans', () => {
    const { engine, calls } = setup({ level: 1 });
    order(engine, 20);
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    engine.state.status = 'overflow';
    engine.finishOverflow();
    expect(calls.end[0]).toMatchObject({ ordersServed: 1, endReason: 'overflow' });
  });

  it('a dish served in the last moments is just in time', () => {
    const { engine } = setup({ level: 1 });
    order(engine, balance.panCookTime + 0.5);
    fill(engine, ['egg', 'bacon']);
    engine.cookAt(0);
    wait(engine, balance.panCookTime + DT);
    expect(engine.drainEvents().find((e) => e.type === 'served')).toMatchObject({ justInTime: true });
  });

  it('every pan busy at once is announced', () => {
    const { engine } = setup({ level: 1 });
    engine.state.nextCustomerAt = Infinity;
    engine.state.customers = [0, 1, 2].map((slot) => ({ uid: slot + 1, typeId: 'calm', recipeId: 'bacon_egg', slot, patience: 20, maxPatience: 20 }));
    fill(engine, ['egg', 'bacon', '.', '.', 'egg', 'bacon', '.', '.', 'egg', 'bacon']);
    engine.cookAt(0);
    engine.cookAt(4);
    expect(engine.drainEvents().some((e) => e.type === 'fullStove')).toBe(false);
    engine.cookAt(8);
    expect(engine.drainEvents().some((e) => e.type === 'fullStove')).toBe(true);
  });

  it('two pans in a combo of x3 also make the kitchen go full, once every few seconds', () => {
    const { engine } = setup({ level: 1 });
    engine.state.nextCustomerAt = Infinity;
    engine.state.customers = [0, 1].map((slot) => ({ uid: slot + 1, typeId: 'calm', recipeId: 'bacon_egg', slot, patience: 20, maxPatience: 20 }));
    fill(engine, ['bread', 'tomato', '.', '.', 'egg', 'bacon', '.', '.', 'egg', 'bacon']);
    engine.cookAt(0); // counter sale: combo x1
    engine.cookAt(4); // pan 1, x2
    expect(engine.drainEvents().some((e) => e.type === 'fullStove')).toBe(false);
    engine.cookAt(8); // pan 2, x3
    expect(engine.drainEvents().some((e) => e.type === 'fullStove')).toBe(true);
  });
});


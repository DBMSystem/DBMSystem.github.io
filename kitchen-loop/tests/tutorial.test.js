import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/game/engine.js';
import { createTutorialRunner } from '../src/systems/tutorial.js';
import { tutorial } from '../src/data/tutorial.js';
import { balance } from '../src/data/balance.js';

const DT = 1 / 60;

function setup() {
  const ended = [];
  const engine = createEngine({
    balance,
    level: tutorial.level,
    seed: 3,
    ingredientQueue: tutorial.ingredientQueue,
    timerRunning: false,
    onEnd: (r) => ended.push(r),
  });
  const runner = createTutorialRunner(engine, tutorial, balance);
  const pump = () => runner.handle(engine.drainEvents());
  const wait = (seconds) => {
    for (let i = 0; i < seconds * 60; i++) engine.step(DT);
  };
  return { engine, runner, pump, wait, ended };
}

describe('tutorial', () => {
  it('fixed ingredient order and clock stopped until the free step', () => {
    const { engine, wait } = setup();
    expect(engine.state.tray.slots).toEqual(['egg', 'bacon', 'cheese']);
    expect(engine.state.tray.preview).toBe('bread');
    wait(20);
    expect(engine.state.timeLeft).toBe(balance.loopDuration);
    expect(engine.state.customers).toHaveLength(0);
  });

  it('only the highlighted slot and cell are accepted in the first steps', () => {
    const { engine, runner } = setup();
    expect(runner.step.id).toBe('dragEgg');
    expect(engine.placeIngredient(1, 5)).toBe(false);
    expect(engine.placeIngredient(0, 0)).toBe(false);
    expect(engine.placeIngredient(0, 5)).toBe(true);
  });

  it('full run: egg → bacon → cook → guided order served → 30 s free loop → end', () => {
    const { engine, runner, pump, wait, ended } = setup();
    engine.placeIngredient(0, 5);
    pump();
    expect(runner.step.id).toBe('dragBacon');
    engine.placeIngredient(1, 6);
    pump();
    expect(runner.step.id).toBe('cook');
    expect(engine.state.glowing.size).toBe(2);
    engine.cookAt(5);
    pump();
    expect(runner.step.id).toBe('order');
    expect(engine.state.customers.map((c) => c.recipeId)).toEqual(['tomato_toast']);

    // Guided order: bread (slot 0) to cell 9, tomato (slot 1) next to it, then cook.
    expect(engine.state.tray.slots.slice(0, 2)).toEqual(['bread', 'tomato']);
    wait(0.5); // cooked cells unlock
    expect(engine.placeIngredient(1, 9)).toBe(false);
    expect(engine.placeIngredient(0, 9)).toBe(true);
    pump();
    expect(runner.step.id).toBe('orderTomato');
    expect(engine.placeIngredient(1, 10)).toBe(true);
    pump();
    expect(runner.step.id).toBe('orderCook');
    engine.cookAt(9);
    pump();
    expect(runner.step.id).toBe('pan');
    wait(balance.panCookTime - 0.1);
    pump();
    expect(runner.step.id).toBe('pan'); // still sizzling, the clock still stopped
    wait(0.2);
    pump();
    expect(runner.step.id).toBe('free');
    expect(engine.state.timerRunning).toBe(true);
    expect(engine.state.timeLeft).toBe(balance.tutorialLoopDuration);
    expect(engine.state.allowedCells).toBeNull();

    wait(balance.tutorialLoopDuration + 1);
    expect(ended).toHaveLength(1);
    expect(ended[0].ordersServed).toBeGreaterThanOrEqual(1);
  });
});

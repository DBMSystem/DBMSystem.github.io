import { describe, it, expect } from 'vitest';
import { createDefaultSave, validateSave } from '../src/save/schema.js';
import { challengeTemplates } from '../src/data/challenges.js';
import { generateChallenges, applyChallenges, progressWith, challengeText, challengeTier, todayChallenges } from '../src/systems/challenges.js';
import { finalizeLoop } from '../src/economy/rewards.js';
import { balance } from '../src/data/balance.js';
import { createRng } from '../src/utils/rng.js';
import { hasKey } from '../src/utils/i18n.js';

let loopN = 0;
const loop = (extra = {}) => ({
  loopId: `c${++loopN}`,
  score: 900,
  bestCombo: 2,
  ordersServed: 3,
  orderCoins: 15,
  servedTypes: [],
  recipesCooked: 4,
  perfectCount: 0,
  feverCount: 0,
  customersLost: 1,
  emptyGridAtEnd: false,
  endReason: 'time',
  cookedCounts: {},
  discovered: [],
  ...extra,
});
const withList = (list) => {
  const save = createDefaultSave(0);
  save.challenges = { date: 'd1', list: list.map((c) => ({ recipeId: null, progress: 0, done: false, ...c })), bonusClaimed: false };
  return save;
};

describe('Pip orders', () => {
  it('every template has numbers in balance and texts', () => {
    for (const c of challengeTemplates) {
      expect(balance.challenges.templates[c.id].targets).toHaveLength(4);
      expect(hasKey(`challenge.${c.id}`)).toBe(true);
    }
  });

  it('are deterministic per day and level, three different ones', () => {
    const a = generateChallenges('2026-09-24', 1);
    expect(generateChallenges('2026-09-24', 1)).toEqual(a);
    expect(a).toHaveLength(balance.challenges.perDay);
    expect(new Set(a.map((c) => c.id)).size).toBe(a.length);
    expect(a.some((c) => c.id === 'fever')).toBe(false); // fever from level 2
    const days = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(generateChallenges(`d${i}`, 5))));
    expect(days.size).toBeGreaterThan(1);
  });

  it('targets grow with the tier', () => {
    expect(challengeTier(1)).toBe(0);
    expect(challengeTier(10)).toBe(3);
    const easy = generateChallenges('d1', 1).find((c) => c.id !== 'noLoss');
    expect(easy.target).toBe(balance.challenges.templates[easy.id].targets[0]);
  });

  it('cook orders pick an orderable recipe and have readable text', () => {
    for (let d = 0; d < 30; d++) {
      for (const c of generateChallenges(`d${d}`, 6)) {
        if (c.id === 'cook') expect(c.recipeId).toBeTruthy();
        expect(challengeText(c)).not.toMatch(/[{}]/);
      }
    }
  });

  it('loop orders take the best service, day orders add up', () => {
    const combo = { id: 'combo', target: 5, progress: 3 };
    expect(progressWith(combo, loop({ bestCombo: 2 }))).toBe(3);
    expect(progressWith(combo, loop({ bestCombo: 4 }))).toBe(4);
    const recipesDay = { id: 'recipes', target: 12, progress: 5 };
    expect(progressWith(recipesDay, loop({ recipesCooked: 4 }))).toBe(9);
    const cook = { id: 'cook', target: 3, progress: 1, recipeId: 'bacon_egg' };
    expect(progressWith(cook, loop({ cookedCounts: { bacon_egg: 2 } }))).toBe(3);
    const noLoss = { id: 'noLoss', target: 1, progress: 0 };
    expect(progressWith(noLoss, loop({ customersLost: 0 }))).toBe(1);
    expect(progressWith(noLoss, loop({ customersLost: 0, endReason: 'overflow' }))).toBe(0);
  });

  it('rewards are granted once and the bonus pack when all are done', () => {
    const save = withList([
      { id: 'combo', target: 3 },
      { id: 'orders', target: 4 },
      { id: 'recipes', target: 8 },
    ]);
    const coins = save.coins;
    const first = applyChallenges(save, loop({ bestCombo: 3 }), 'd1');
    expect(first.completed.map((c) => c.id)).toEqual(['combo']);
    expect(save.coins).toBe(coins + balance.challenges.templates.combo.reward.coins);
    expect(first.bonus).toBeNull();
    const second = applyChallenges(save, loop({ bestCombo: 5, ordersServed: 5, recipesCooked: 4 }), 'd1');
    expect(second.completed.map((c) => c.id)).toEqual(['orders', 'recipes']);
    expect(second.bonus).toEqual({ packs: balance.challenges.bonusPacks });
    expect(save.packs.standard).toBe(balance.challenges.bonusPacks);
    const third = applyChallenges(save, loop({ bestCombo: 9 }), 'd1');
    expect(third).toEqual({ completed: [], bonus: null });
  });

  it('a new day brings new orders', () => {
    const save = withList([{ id: 'combo', target: 3, done: true, progress: 3 }]);
    applyChallenges(save, loop(), 'd2');
    expect(save.challenges.date).toBe('d2');
    expect(save.challenges.list.every((c) => !c.done)).toBe(true);
    expect(todayChallenges(save, 'd2')).toBe(save.challenges.list);
  });

  it('finalizeLoop applies them, but not in the tutorial', () => {
    const save = createDefaultSave(0);
    const tutorial = finalizeLoop(save, loop({ tutorial: true }), { rng: createRng(1), now: 0, today: 'd1' });
    expect(tutorial.challenges.completed).toEqual([]);
    expect(save.challenges.date).toBeNull();
    const summary = finalizeLoop(save, loop(), { rng: createRng(1), now: 0, today: 'd1' });
    expect(save.challenges.date).toBe('d1');
    expect(summary.challenges).toBeDefined();
  });

  it('save validation repairs broken orders', () => {
    const save = createDefaultSave(0);
    save.challenges = { date: 'd1', list: [{ id: 'hack', target: 1, progress: 1, done: true }, { id: 'combo', target: 3, progress: 99, done: 'yes' }], bonusClaimed: 1 };
    const clean = validateSave(save);
    expect(clean.challenges.list).toHaveLength(1);
    expect(clean.challenges.list[0].progress).toBe(3);
    expect(typeof clean.challenges.list[0].done).toBe('boolean');
  });
});

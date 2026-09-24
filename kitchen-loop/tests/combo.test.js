import { describe, it, expect } from 'vitest';
import { createComboState, registerCook, updateCombo, comboMultiplier } from '../src/game/combo.js';
import { recipePoints } from '../src/game/scoring.js';
import { balance } from '../src/data/balance.js';

describe('combo window', () => {
  it('grows inside the window and resets after it', () => {
    const s = createComboState();
    expect(registerCook(s, 0, balance).chain).toBe(1);
    expect(registerCook(s, 2.9, balance).chain).toBe(2);
    updateCombo(s, 2.9 + balance.comboWindow + 0.01, balance);
    expect(s.chain).toBe(0);
    expect(s.best).toBe(2);
  });

  it('a cook exactly at the window edge still counts', () => {
    const s = createComboState();
    registerCook(s, 0, balance);
    expect(registerCook(s, balance.comboWindow, balance).chain).toBe(2);
  });

  it('multiplier keeps the previous step between steps', () => {
    const table = balance.comboMultipliers;
    expect([1, 2, 3, 4, 5, 9, 10, 25].map((n) => comboMultiplier(n, table))).toEqual([1, 1.2, 1.5, 1.5, 2, 2, 3, 3]);
  });
});

describe('¡En su punto!', () => {
  it('3 recipes within 4 s trigger it once, then the count restarts', () => {
    const s = createComboState();
    expect(registerCook(s, 0, balance).perfect).toBe(false);
    expect(registerCook(s, 2, balance).perfect).toBe(false);
    expect(registerCook(s, 4, balance).perfect).toBe(true);
    expect(registerCook(s, 5, balance).perfect).toBe(false);
    expect(s.perfectCount).toBe(1);
  });

  it('does not trigger if the 3 recipes take longer than the window', () => {
    const s = createComboState();
    registerCook(s, 0, balance);
    registerCook(s, 2.5, balance);
    expect(registerCook(s, 4.5, balance).perfect).toBe(false);
  });
});

describe('fiebre', () => {
  const cookChain = (s, n, gap = 1) => {
    let last;
    for (let i = 0; i < n; i++) last = registerCook(s, i * gap, balance);
    return last;
  };

  it('starts at the threshold, lasts feverDuration and widens the combo window', () => {
    const s = createComboState();
    const r = cookChain(s, balance.feverThreshold);
    expect(r.feverStarted).toBe(true);
    const start = s.lastCookAt;
    // window during fever is comboWindow × 1.5
    updateCombo(s, start + balance.comboWindow + 0.1, balance);
    expect(s.chain).toBe(balance.feverThreshold);
    updateCombo(s, start + balance.feverDuration, balance);
    expect(s.fever.active).toBe(false);
  });

  it('can start again in the same loop', () => {
    const s = createComboState();
    cookChain(s, balance.feverThreshold);
    updateCombo(s, 100, balance);
    for (let i = 0; i < balance.feverThreshold; i++) registerCook(s, 100 + i, balance);
    expect(s.fever.count).toBe(2);
  });
});

describe('scoring', () => {
  it('base × combo × fever, +50 % for an order, ×0,5 for a counter sale', () => {
    expect(recipePoints({ base: 100, chain: 1, feverActive: false, served: true }, balance).points).toBe(150);
    expect(recipePoints({ base: 100, chain: 1, feverActive: false, served: false }, balance).points).toBe(50);
    expect(recipePoints({ base: 100, chain: 3, feverActive: false, served: true }, balance).points).toBe(225);
    expect(recipePoints({ base: 100, chain: 10, feverActive: true, served: true }, balance).points).toBe(675);
  });
});

import { describe, it, expect } from 'vitest';
import { createSaveManager } from '../src/save/saveManager.js';
import { createMemoryAdapter } from '../src/save/storageAdapter.js';
import { finalizeLoop } from '../src/economy/rewards.js';
import { createRng } from '../src/utils/rng.js';

let loopN = 0;
const result = (extra = {}) => ({ loopId: `loop-${++loopN}`, score: 900, bestCombo: 4, ordersServed: 5, orderCoins: 25, servedTypes: [], feverCount: 0, emptyGridAtEnd: false, endReason: 'time', cookedCounts: { bacon_egg: 3 }, discovered: ['bacon_crown'], ...extra });
const applyLoopResult = (save, r) => finalizeLoop(save, r, { rng: createRng(1), now: 0 });

describe('save manager', () => {
  it('new game when there is no save', async () => {
    const manager = createSaveManager(createMemoryAdapter());
    const save = await manager.load();
    expect(save.stats.loopsPlayed).toBe(0);
    expect(save.player.name).toBe('Aprendiz');
  });

  it('saves and reloads without losses', async () => {
    const storage = createMemoryAdapter();
    const a = createSaveManager(storage);
    await a.load();
    await a.update((s) => applyLoopResult(s, result()));
    const b = createSaveManager(storage);
    const save = await b.load();
    expect(save.stats).toMatchObject({ loopsPlayed: 1, bestScore: 900, bestCombo: 4, totalOrders: 5 });
    expect(save.recipes.bacon_egg.timesCooked).toBe(3);
    expect(save.recipes.bacon_crown.discovered).toBe(true);
    expect(storage.data.has('kitchenloop.save.tmp')).toBe(false);
  });

  it('recovers the backup when the main save is corrupt', async () => {
    const storage = createMemoryAdapter();
    const events = [];
    const a = createSaveManager(storage);
    await a.load();
    await a.update((s) => applyLoopResult(s, result()));
    await a.update((s) => applyLoopResult(s, result({ score: 100 })));
    storage.data.set('kitchenloop.save', '{broken');
    const save = await createSaveManager(storage, { onEvent: (e) => events.push(e) }).load();
    expect(events).toEqual(['save_recovered']);
    expect(save.stats.loopsPlayed).toBe(1);
  });

  it('starts over (save_reset) when main and backup are unusable', async () => {
    const storage = createMemoryAdapter({ 'kitchenloop.save': 'null', 'kitchenloop.save.backup': '[]' });
    const events = [];
    const save = await createSaveManager(storage, { onEvent: (e) => events.push(e) }).load();
    expect(events).toEqual(['save_reset']);
    expect(save.stats.bestScore).toBe(0);
  });

  it('fixes absurd values and drops unknown recipes', async () => {
    const raw = { saveVersion: 1, stats: { bestScore: -5, loopsPlayed: NaN }, recipes: { nope: { timesCooked: 3 }, bacon_egg: { timesCooked: -1 } } };
    const save = await createSaveManager(createMemoryAdapter({ 'kitchenloop.save': JSON.stringify(raw) })).load();
    expect(save.stats.bestScore).toBe(0);
    expect(save.stats.loopsPlayed).toBe(0);
    expect(save.recipes).toEqual({ bacon_egg: { discovered: false, timesCooked: 0 } });
  });

  it('record only when the score beats the best', async () => {
    const save = await createSaveManager(createMemoryAdapter()).load();
    save.stats.bestScore = 1000;
    expect(applyLoopResult(save, result()).newRecord).toBe(false);
    expect(applyLoopResult(save, result({ score: 1001, endReason: 'overflow' })).newRecord).toBe(true);
    expect(save.stats.overflows).toBe(1);
  });
});

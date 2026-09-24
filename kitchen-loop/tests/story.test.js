import { describe, it, expect } from 'vitest';
import { createDefaultSave, validateSave } from '../src/save/schema.js';
import { advanceStory, pendingScenes, markSceneSeen } from '../src/systems/story.js';
import { utensilState, treeTotalCost, treeComplete } from '../src/systems/utensils.js';
import { buyUtensil, buyDecor, addCoins } from '../src/inventory/inventory.js';
import { availableSpecialties, rollSpecialties } from '../src/systems/specialty.js';
import { unlocksBetween } from '../src/economy/progression.js';
import { finalizeLoop } from '../src/economy/rewards.js';
import { utensils } from '../src/data/utensils.js';
import { decorItems } from '../src/data/decor.js';
import { chapterScenes } from '../src/data/dialogues.js';
import { balance } from '../src/data/balance.js';
import { createRng } from '../src/utils/rng.js';
import { hasKey } from '../src/utils/i18n.js';

const fresh = () => createDefaultSave(0);
const loop = (score = 500) => ({ score });
const rich = (save) => addCoins(save, 100000, 'test');

describe('story chapters (spec 6.3)', () => {
  it('chapter 2 opens at level 3', () => {
    const save = fresh();
    expect(advanceStory(save, loop())).toEqual([]);
    save.player.level = 3;
    expect(advanceStory(save, loop())).toEqual([2]);
    expect(pendingScenes(save)).toEqual(['chapter2']);
  });

  it('Brûlée: a good loop from loop 3, guaranteed at the end of loop 6, only after a loop', () => {
    const save = fresh();
    save.player.level = 3;
    advanceStory(save);
    save.stats.loopsPlayed = 2;
    expect(advanceStory(save, loop(5000))).toEqual([]);
    save.stats.loopsPlayed = 3;
    expect(advanceStory(save, loop(balance.bruleeScoreThreshold - 1))).toEqual([]);
    expect(advanceStory(save)).toEqual([]); // not outside a loop's results
    expect(advanceStory(save, loop(balance.bruleeScoreThreshold))).toEqual([3]);
    expect(save.story.bruleeMet).toBe(true);

    const late = fresh();
    late.player.level = 3;
    late.stats.loopsPlayed = balance.bruleeGuaranteedLoop;
    expect(advanceStory(late, loop(0))).toEqual([2, 3]);
  });

  it('chapters 4–7 follow the tree, level and secrets; the finale after the lost recipe', () => {
    const save = fresh();
    Object.assign(save.story, { chapter: 3, seenScenes: ['chapter2', 'chapter3'] });
    rich(save);
    buyUtensil(save, 'runic_counter');
    expect(advanceStory(save)).toEqual([4]);
    buyUtensil(save, 'crystal_spatula');
    buyUtensil(save, 'time_ladle');
    expect(advanceStory(save)).toEqual([]); // chapter 5 also needs level 12
    save.player.level = 16;
    expect(advanceStory(save)).toEqual([5]);
    for (const id of ['bacon_crown', 'impossible_omelette', 'mystic_scramble']) save.recipes[id] = { discovered: true, timesCooked: 1 };
    expect(advanceStory(save)).toEqual([6]);
    for (const u of utensils) buyUtensil(save, u.id);
    expect(treeComplete(save)).toBe(true);
    expect(advanceStory(save)).toEqual([7]);
    for (const id of ['chapter4', 'chapter5', 'chapter6', 'chapter7']) markSceneSeen(save, id);
    expect(pendingScenes(save)).toEqual([]);
    save.recipes.lost_recipe = { discovered: true, timesCooked: 1 };
    expect(pendingScenes(save)).toEqual(['finale']);
  });

  it('every scene has at most 3 bubbles with texts', () => {
    for (const [id, scene] of Object.entries(chapterScenes)) {
      expect(scene.bubbles.length, id).toBeLessThanOrEqual(3);
      for (const b of scene.bubbles) expect(hasKey(b.key), b.key).toBe(true);
    }
    for (let n = 1; n <= 7; n++) expect(hasKey(`chapter.${n}`)).toBe(true);
  });

  it('finalizeLoop opens chapters and reports them', () => {
    const save = fresh();
    save.player.level = 3;
    const summary = finalizeLoop(save, { loopId: 's1', score: 100, ordersServed: 1, orderCoins: 5, bestCombo: 1, servedTypes: [], feverCount: 0, endReason: 'time', cookedCounts: {}, discovered: [] }, { rng: createRng(1), now: 0 });
    expect(summary.chapters).toEqual([2]);
  });
});

describe('Brûlée’s warehouse (spec 5.4, 5.6)', () => {
  it('the tree costs 13.500 coins and follows its requirements', () => {
    expect(treeTotalCost()).toBe(13500);
    const save = fresh();
    rich(save);
    expect(utensilState(save, 'runic_counter')).toBe('locked'); // chapter 3
    save.story.chapter = 3;
    expect(buyUtensil(save, 'crystal_spatula')).toBe(false);
    expect(buyUtensil(save, 'runic_counter')).toBe(true);
    expect(buyUtensil(save, 'runic_counter')).toBe(false);
    expect(utensilState(save, 'ancient_spice')).toBe('locked');
    buyUtensil(save, 'time_ladle');
    expect(utensilState(save, 'ancient_spice')).toBe('available');
    buyUtensil(save, 'ancient_spice');
    expect(utensilState(save, 'enchanted_pot')).toBe('locked'); // needs 2 of tier 3
    buyUtensil(save, 'golden_whisk');
    expect(utensilState(save, 'enchanted_pot')).toBe('available');
  });

  it('purchases need the coins and go through the inventory', () => {
    const save = fresh();
    save.story.chapter = 3;
    addCoins(save, 399, 'test');
    expect(buyUtensil(save, 'runic_counter')).toBe(false);
    addCoins(save, 1, 'test');
    expect(buyUtensil(save, 'runic_counter')).toBe(true);
    expect(save.coins).toBe(0);
  });

  it('decoration costs 150–2000 coins, is placed once and survives validation', () => {
    for (const d of decorItems) {
      expect(d.cost).toBeGreaterThanOrEqual(150);
      expect(d.cost).toBeLessThanOrEqual(2000);
      expect(hasKey(`decor.${d.id}.name`)).toBe(true);
    }
    expect(decorItems).toHaveLength(10);
    const save = fresh();
    rich(save);
    expect(buyDecor(save, 'sleeping_cat')).toBe(true);
    expect(buyDecor(save, 'sleeping_cat')).toBe(false);
    expect(save.decor.floor).toBe('sleeping_cat');
    save.unlockedItems.push('hacked_item');
    save.decor.wall = 'sleeping_cat';
    const clean = validateSave(save);
    expect(clean.unlockedItems).toEqual(['sleeping_cat']);
    expect(clean.decor).toEqual({ floor: 'sleeping_cat' });
  });
});

describe('daily specialty (spec 2.12)', () => {
  it('from level 4; the critic and Brûlée’s Night need their unlocks', () => {
    const save = fresh();
    expect(availableSpecialties(save)).toEqual([]);
    save.player.level = 4;
    expect(availableSpecialties(save).map((s) => s.id)).toEqual(['breakfast', 'baconFest', 'pipVisit', 'crazyKitchen']);
    save.player.level = 5;
    save.story.chapter = 3;
    expect(availableSpecialties(save).map((s) => s.id)).toContain('bruleeNight');
    const picked = rollSpecialties(createRng(2), save);
    expect(picked).toHaveLength(balance.specialtyChoices);
    expect(new Set(picked.map((s) => s.id)).size).toBe(picked.length);
    for (const s of availableSpecialties(save)) expect(hasKey(`specialty.${s.id}.name`)).toBe(true);
  });
});

it('level-ups never announce secret recipes', () => {
  const news = unlocksBetween(1, 4);
  expect(news.some((u) => u.id === 'bacon_crown' || u.id === 'mystic_scramble')).toBe(false);
  expect(news.some((u) => u.id === 'triple_bacon')).toBe(true);
});

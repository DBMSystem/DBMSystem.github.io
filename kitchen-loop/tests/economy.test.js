import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultSave, validateSave } from '../src/save/schema.js';
import { addCard, craftCard, makeShiny, addCoins, spendCoins } from '../src/inventory/inventory.js';
import { openPack, packRarities } from '../src/cards/packs.js';
import { loopCardChance, comboStepsReached } from '../src/cards/drops.js';
import { addXp, xpToNext, unlocksBetween } from '../src/economy/progression.js';
import { finalizeLoop, loopCoins, loopXp, TUTORIAL_CARD } from '../src/economy/rewards.js';
import { claimCalendar, canClaimCalendar } from '../src/systems/calendar.js';
import { cards, cardById } from '../src/data/cards.js';
import { discoveriesFor } from '../src/cards/album.js';
import { recipes } from '../src/data/recipes.js';
import { balance } from '../src/data/balance.js';
import { createRng } from '../src/utils/rng.js';
import { hasKey, t } from '../src/utils/i18n.js';

const fresh = () => createDefaultSave(0);
let loopN = 0;
const loop = (extra = {}) => ({
  loopId: `l${++loopN}`,
  score: 1500,
  bestCombo: 3,
  ordersServed: 6,
  orderCoins: 30,
  servedTypes: [],
  feverCount: 0,
  emptyGridAtEnd: false,
  endReason: 'time',
  cookedCounts: {},
  discovered: [],
  ...extra,
});

describe('inventory', () => {
  it('a repeated card becomes fragments', () => {
    const save = fresh();
    expect(addCard(save, 'burnt_egg', 1).isNew).toBe(true);
    const again = addCard(save, 'burnt_egg', 2);
    expect(again).toMatchObject({ isNew: false, fragments: balance.duplicateFragments.common });
    expect(save.cards.burnt_egg.count).toBe(2);
    expect(save.fragments).toBe(balance.duplicateFragments.common);
  });

  it('crafting: only missing pack cards, paying fragments; discovery cards never', () => {
    const save = fresh();
    save.fragments = 1000;
    expect(craftCard(save, 'void_chef', 0)).toBeNull();
    expect(craftCard(save, 'galactic_bread', 0).isNew).toBe(true);
    expect(save.fragments).toBe(1000 - balance.craftCost.epic);
    expect(craftCard(save, 'galactic_bread', 0)).toBeNull();
  });

  it('shiny variant of an owned card', () => {
    const save = fresh();
    save.fragments = balance.shinyCost.common;
    expect(makeShiny(save, 'burnt_egg')).toBe(false);
    addCard(save, 'burnt_egg', 0);
    expect(makeShiny(save, 'burnt_egg')).toBe(true);
    expect(save.fragments).toBe(0);
  });

  it('coins: no negatives, no spending what you do not have', () => {
    const save = fresh();
    expect(addCoins(save, -5)).toBe(0);
    addCoins(save, 10);
    expect(spendCoins(save, 11)).toBe(false);
    expect(spendCoins(save, 10)).toBe(true);
    expect(save.coins).toBe(0);
  });
});

describe('packs', () => {
  it('3 cards; no legendary in the first legendaryMinPacks packs', () => {
    const save = fresh();
    const rng = createRng(5);
    for (let i = 0; i < balance.legendaryMinPacks; i++) {
      const results = openPack(save, rng, 0);
      expect(results).toHaveLength(balance.packSize);
      expect(results.some((r) => r.rarity === 'legendary')).toBe(false);
    }
  });

  it('epic pity: at least one epic or better every epicPity packs', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const save = fresh();
      const rng = createRng(seed);
      let since = 0;
      for (let i = 0; i < 100; i++) {
        const got = openPack(save, rng, 0).some((r) => r.rarity === 'epic' || r.rarity === 'legendary');
        since = got ? 0 : since + 1;
        expect(since).toBeLessThan(balance.epicPity);
      }
    }
  });

  it('legendary pity: at least one legendary every legendaryPity packs after the minimum', () => {
    const save = fresh();
    const rng = createRng(9);
    let since = 0;
    for (let i = 0; i < 300; i++) {
      const got = openPack(save, rng, 0).some((r) => r.rarity === 'legendary');
      since = got ? 0 : since + 1;
      if (i >= balance.legendaryMinPacks) expect(since).toBeLessThan(balance.legendaryPity);
    }
  });

  it('special pack: third card epic or better', () => {
    const save = fresh();
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) expect(['epic', 'legendary']).toContain(packRarities(save, rng, true)[2]);
  });

  it('prefers cards the player does not have (newCardBias)', () => {
    const rng = createRng(11);
    let newOnes = 0;
    const commons = cards.filter((c) => c.source === 'pack' && c.rarity === 'common');
    for (let i = 0; i < 400; i++) {
      const save = fresh();
      commons.slice(0, 10).forEach((c) => addCard(save, c.id, 0)); // half owned
      save.pity.packsOpened = 0;
      const result = openPack(save, rng, 0)[0];
      if (result.rarity === 'common' && result.isNew) newOnes++;
    }
    // Without bias ~50 % of commons would be new; with 0,6 bias ~80 %.
    expect(newOnes / 400).toBeGreaterThan(0.5);
  });

  it('never gives discovery cards', () => {
    const save = fresh();
    const rng = createRng(2);
    for (let i = 0; i < 200; i++) for (const r of openPack(save, rng, 0)) expect(cardById[r.cardId].source).toBe('pack');
  });
});

describe('loop rewards', () => {
  it('card chance: base + per order + per combo step, capped', () => {
    expect(comboStepsReached(1)).toBe(0);
    expect(comboStepsReached(3)).toBe(2);
    expect(comboStepsReached(10)).toBe(4);
    expect(loopCardChance({ ordersServed: 0, bestCombo: 1 })).toBeCloseTo(balance.loopCardBase);
    expect(loopCardChance({ ordersServed: 6, bestCombo: 3 })).toBeCloseTo(balance.loopCardBase + 6 * balance.loopCardPerOrder + 2 * balance.loopCardPerComboStep);
    expect(loopCardChance({ ordersServed: 40, bestCombo: 10 })).toBe(balance.loopCardMax);
  });

  it('coins and XP match the reference loop (spec 2.14)', () => {
    const r = loop({ score: 1500, ordersServed: 6, orderCoins: 30 });
    expect(loopCoins(r)).toBe(37);
    expect(loopXp(r)).toBe(105);
  });

  it('finalizeLoop is idempotent', () => {
    const save = fresh();
    const r = loop();
    expect(finalizeLoop(save, r, { rng: createRng(1), now: 0 })).not.toBeNull();
    const coins = save.coins;
    expect(finalizeLoop(save, r, { rng: createRng(1), now: 0 })).toBeNull();
    expect(save.coins).toBe(coins);
    expect(save.stats.loopsPlayed).toBe(1);
  });

  it('tutorial gives the guaranteed first card', () => {
    const save = fresh();
    const summary = finalizeLoop(save, loop({ tutorial: true }), { rng: createRng(1), now: 0 });
    expect(summary.cards.map((c) => c.cardId)).toEqual([TUTORIAL_CARD]);
  });

  it('discovery cards from what happened in the loop', () => {
    const save = fresh();
    const summary = finalizeLoop(
      save,
      loop({ discovered: ['bacon_crown'], cookedCounts: { triple_bacon: 3, bacon_crown: 1 }, feverCount: 2, emptyGridAtEnd: true, servedTypes: ['critic'] }),
      { rng: createRng(1), now: 0 },
    );
    const ids = summary.cards.map((c) => c.cardId);
    expect(ids).toEqual(expect.arrayContaining(['bacon_crown', 'triple_bacon_master', 'double_fever', 'void_chef', 'happy_critic']));
    expect(save.recipes.bacon_crown.discovered).toBe(true);
  });

  it('mastery rewards when a recipe reaches 10 and 50 cooks', () => {
    const save = fresh();
    const summary = finalizeLoop(save, loop({ cookedCounts: { bacon_egg: 10 } }), { rng: createRng(1), now: 0 });
    expect(summary.mastery).toEqual([{ recipeId: 'bacon_egg', level: 2, ...balance.masteryRewards[1] }]);
  });
});

describe('progression', () => {
  it('XP curve, coins per level and a pack every 3 levels', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(10)).toBe(640);
    const save = fresh();
    const levels = addXp(save, 100 + 160 + 220);
    expect(levels.map((l) => l.level)).toEqual([2, 3, 4]);
    expect(save.coins).toBe(balance.levelCoinReward * (2 + 3 + 4));
    expect(save.packs.standard).toBe(1);
    expect(save.player.xp).toBe(0);
  });

  it('level-up unlocks come from the unlock table', () => {
    expect(unlocksBetween(2, 3)).toEqual(expect.arrayContaining([{ kind: 'ingredients', id: 'mushroom' }, { kind: 'recipes', id: 'mushroom_omelette' }]));
  });

  it('reference pace: level 2 after 1 loop, level 10 in about 29 loops', () => {
    const save = fresh();
    addXp(save, 105);
    expect(save.player.level).toBe(2);
    for (let i = 1; i < 29; i++) addXp(save, 105 + (i % 3) * 5);
    expect(save.player.level).toBeGreaterThanOrEqual(9);
    expect(save.player.level).toBeLessThanOrEqual(11);
  });
});

describe('calendar', () => {
  it('once per day; skipped days reset nothing; cycles after day 7', () => {
    const save = fresh();
    const rng = createRng(4);
    expect(claimCalendar(save, rng, '2026-09-01', 0).day).toBe(1);
    expect(canClaimCalendar(save, '2026-09-01')).toBe(false);
    expect(claimCalendar(save, rng, '2026-09-01', 0)).toBeNull();
    expect(claimCalendar(save, rng, '2026-09-09', 0).day).toBe(2); // a week later: day 2
    for (let d = 3; d <= 7; d++) claimCalendar(save, rng, `2026-10-0${d}`, 0);
    expect(claimCalendar(save, rng, '2026-10-20', 0).day).toBe(1);
  });

  it('day 6 gives a special pack, day 7 an epic card', () => {
    const save = fresh();
    const rng = createRng(4);
    for (let d = 1; d <= 7; d++) claimCalendar(save, rng, `2026-09-0${d}`, 0);
    expect(save.packs.special).toBe(1);
    expect(Object.keys(save.cards).some((id) => cardById[id].rarity === 'epic')).toBe(true);
  });
});

describe('save validation (phase 2)', () => {
  it('fixes absurd values and drops unknown ids', () => {
    const clean = validateSave({
      saveVersion: 1,
      player: { name: '   ', level: 99, xp: -4 },
      coins: -10,
      fragments: 'mucho',
      cards: { burnt_egg: { count: 2 }, fake_card: { count: 1 }, sad_tomato: { count: 0 } },
      packs: { standard: 2.5, special: 1 },
      calendar: { dayIndex: 12, lastClaimDate: 'ayer' },
      equippedPan: 'diamond',
      settings: { sfx: 7 },
    });
    expect(clean.player).toEqual({ name: 'Aprendiz', level: balance.maxLevel, xp: 0 });
    expect(clean.coins).toBe(0);
    expect(clean.fragments).toBe(0);
    expect(Object.keys(clean.cards)).toEqual(['burnt_egg']);
    expect(clean.packs).toEqual({ standard: 0, special: 1 });
    expect(clean.calendar).toEqual({ dayIndex: 0, lastClaimDate: null });
    expect(clean.equippedPan).toBe('default');
    expect(clean.settings.sfx).toBe(1);
  });
});

describe('album data (spec 4.3, 6.4, 15.1)', () => {
  const countBy = (rarity, source) => cards.filter((c) => c.rarity === rarity && c.source === source).length;

  it('120 cards with the expanded distribution (D-8) and unique ids/numbers', () => {
    expect(cards).toHaveLength(120);
    expect([countBy('common', 'pack'), countBy('rare', 'pack'), countBy('epic', 'pack'), countBy('legendary', 'pack')]).toEqual([50, 30, 14, 4]);
    expect([countBy('rare', 'discovery'), countBy('epic', 'discovery'), countBy('legendary', 'discovery')]).toEqual([9, 8, 5]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(120);
    expect(new Set(cards.map((c) => c.number)).size).toBe(120);
  });

  it('12 story fragments, at least 8 on common or rare cards', () => {
    const withFragment = cards.filter((c) => c.storyFragment);
    expect(withFragment.map((c) => c.storyFragment).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(withFragment.filter((c) => c.rarity === 'common' || c.rarity === 'rare').length).toBeGreaterThanOrEqual(8);
    for (let n = 1; n <= 12; n++) expect(hasKey(`fragment.${n}`)).toBe(true);
  });

  it('every secret recipe has its discovery card', () => {
    for (const r of recipes.filter((r) => r.kind === 'secret')) {
      expect(cards.some((c) => c.unlock?.type === 'secret' && c.unlock.recipe === r.id), r.id).toBe(true);
    }
  });

  it('texts exist, lore ≤ 140 characters, discovery cards have a hint', () => {
    for (const c of cards) {
      expect(hasKey(`card.${c.id}.name`), c.id).toBe(true);
      expect(t(`card.${c.id}.lore`).length, c.id).toBeLessThanOrEqual(140);
      if (c.source === 'discovery') expect(hasKey(`card.${c.id}.hint`), c.id).toBe(true);
    }
  });

  it('discovery cards come from what happens in a loop', () => {
    const base = loop({ perfectCount: 0, customersLost: 1 });
    expect(discoveriesFor(base)).toEqual([]);
    expect(discoveriesFor({ ...base, bestCombo: 10 })).toContain('combo_ten');
    expect(discoveriesFor({ ...base, perfectCount: 3 })).toContain('perfect_trio');
    expect(discoveriesFor({ ...base, score: 3000 })).toContain('high_score');
    expect(discoveriesFor({ ...base, customersLost: 0, ordersServed: 8 })).toContain('untouchable');
    expect(discoveriesFor({ ...base, customersLost: 0, ordersServed: 8, endReason: 'overflow' })).not.toContain('untouchable');
    expect(discoveriesFor({ ...base, feverCount: 3 })).toEqual(expect.arrayContaining(['double_fever', 'triple_fever']));
    const known = ['secret', 'serve', 'cookInLoop', 'emptyGridAtEnd', 'feverInLoop', 'comboInLoop', 'perfectInLoop', 'scoreInLoop', 'noLossLoop'];
    for (const c of cards.filter((c) => c.unlock)) expect(known, c.id).toContain(c.unlock.type);
  });

  it('every art layer points to an existing sprite', () => {
    for (const c of cards) {
      for (const [sprite] of c.art) {
        const exists = ['png', 'jpg'].some((ext) => existsSync(join(import.meta.dirname, '../src/assets/sprites', `${sprite}.${ext}`)));
        expect(exists, `${c.id}: ${sprite}`).toBe(true);
      }
    }
  });

  it('duplicate fragments are always below the craft cost', () => {
    for (const r of Object.keys(balance.craftCost)) expect(balance.duplicateFragments[r]).toBeLessThan(balance.craftCost[r]);
  });
});
